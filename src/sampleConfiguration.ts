import { ScanTypes, ParamUid, ScanTypeName, ScanType } from './scanTypes.ts';
import { Guid, generateUniqueNames } from "./components/utils.tsx";
import { ObjectWithGuid, EditQueueEntry, UndoHistory, UndoHistoryEntry } from "./undoHistory.ts";

// Class definitions to represent sample configurations,
// sets of sample configurations, and undo/redo history for changes
// to those sets.


export interface SampleConfigurationDto extends ObjectWithGuid {
  // Unique identifier of the set this config belongs to.
  setId: Guid;
  // Intended to be short and unique, but this is not strictly enforced.
  name: string;
  // If set to false, this SampleConfiguration should be ignored in the UI,
  // and should be deleted on the server as soon as undo history is purged.
  isValid: boolean;
  // Intended to be a unique number, but not enforced, for editing convenience.
  mmFromLeftEdge: number;
  // Meant to be longer than the name.  Can be blank.
  description: string;
  scanType: ScanTypeName;
  // Key/value parameter set. Keys should only be valid for the chosen ScanType.
  // This is not strictly enforced, so old inapplicable values can be preserved
  // in case a previous ScanType selection is re-selected.
  parameters: Map<ParamUid, string|null>
}


// Represents the configuration for one sample
export class SampleConfiguration implements SampleConfigurationDto {

  // A unique identifier generated on the server.
  id: Guid;
  // Unique identifier of the set this config belongs to.
  setId: Guid;
  // Intended to be short and unique, but this is not strictly enforced.
  name: string;
  // If set to false, this SampleConfiguration should be ignored in the UI,
  // and should be deleted on the server as soon as undo history is purged.
  isValid: boolean;
  // Intended to be a unique number, but not enforced, for editing convenience.
  mmFromLeftEdge: number;
  // Meant to be longer than the name.  Can be blank.
  description: string;
  scanType: ScanTypeName;
  // Key/value parameter set. Keys should only be valid for the chosen ScanType.
  // This is not strictly enforced, so old inapplicable values can be preserved
  // in case a previous ScanType selection is re-selected.
  parameters: Map<ParamUid, string|null>

	constructor (p: SampleConfigurationDto) {
		this.id = p.id;
		this.setId = p.setId;
		this.name = p.name;
    this.isValid = p.isValid;
		this.mmFromLeftEdge = p.mmFromLeftEdge || 0;
		this.description = p.description || "";
		this.scanType = p.scanType;
		this.parameters = new Map(p.parameters);
	}

  clone() {
    return new SampleConfiguration({
      id: this.id,
      setId: this.setId,
      name: this.name,
      isValid: this.isValid,
      mmFromLeftEdge: this.mmFromLeftEdge,
      description: this.description,
      scanType: this.scanType,
      parameters: this.parameters // Copied during creation
  	});
  }
}


export class SampleConfigurationSet {
  id: Guid;
  name: string;
  // Can remain empty
  description: string;
  configurationsById: Map<string, SampleConfiguration>;
  // An array of identifiers of all parameters used
  // by the ScanTypes of all current SampleConfigurations.
  relevantParameters: Array<ParamUid>;
  // Undo/redo history tracker
  history: UndoHistory;
  // A cached value used as a reference by e.g. findRelevantParameters.
  // This can be undefined until legitimate ScanType information is available.
  scanTypesByName!: Map<ScanTypeName, ScanType>;

  constructor(id: Guid, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.configurationsById = new Map();
    this.description = description;
    this.relevantParameters = [];
    this.history = new UndoHistory();
  }

  setScanTypes(scanTypesCache: ScanTypes) {
    this.scanTypesByName = scanTypesCache.typesByName;
    this.findRelevantParameters();
  }

  // Look through all the current sample configurations for scan parameters,
  // and gather all the unique parameter names into a list, in the order encountered.
  // Used for deciding which parameter columns to render in the interface.
  findRelevantParameters() {
    const scanTypesByName = this.scanTypesByName;
    let workingSet: Set<ParamUid> = new Set();
    let relevantParameters: ParamUid[] = [];

    // Start from the SampleConfiguration closest to the left edge,
    // since that's the default sort when displaying them.
    const sortedSamples = this.all().sort((a, b) => a.mmFromLeftEdge - b.mmFromLeftEdge);

    sortedSamples.forEach((v) => {
      if (!scanTypesByName.has(v.scanType)) { return; }
      const t = scanTypesByName.get(v.scanType)!;
      t.parameters.forEach((p) => {
        if (!workingSet.has(p)) {
          relevantParameters.push(p);
          workingSet.add(p);
        }
      });
    });
    this.relevantParameters = relevantParameters;
  }

  generateUniqueNames(suggestedName: string, quantity?: number, startIndex?: number | null): string[] {
    let existingNames: string[] = [];
    this.configurationsById.forEach((v) => { existingNames.push(v.name) });

    return generateUniqueNames(existingNames, suggestedName, quantity, startIndex);
  }

  // Generate bar locations that are at least 13mm beyond the current
  // rightmost config location, and 13mm apart from each other, with a default minimum of 3mm.
  generateOpenLocations(quantity?: number) {
    var chosenQuantity = Math.max(quantity||1, 1);

    var maxUniqueLocation = 3;
    this.configurationsById.forEach((v) => {
      maxUniqueLocation = Math.max(v.mmFromLeftEdge, maxUniqueLocation);
    });

    maxUniqueLocation += 13;

    var goodLocations: number[] = [];
    while (chosenQuantity > 0) {
      goodLocations.push(maxUniqueLocation);
      maxUniqueLocation += 13;
      chosenQuantity--;
    }
    return goodLocations;
  }

  all() {
    return Array.from(this.configurationsById.values());
  }


  addOrReplaceWithHistory(input: SampleConfiguration[]) {
    const h = new UndoHistoryEntry();
    const currentSet = this.configurationsById;

    // Every given SampleConfiguration is a new change in forward history
    input.forEach((i) => h.forwardAdd(i));
    // Every given SampleConfiguration with a novel id (not seen in the current set)
    // should be removed if we go backward in history (undo)
    const newConfigs = input.filter((i) => !currentSet.has(i.id));
    newConfigs.forEach((i) => h.backwardDelete(i));
    // Every SampleConfiguration in the existing set that's replaced by a new one
    // should be preserved and restored if we go backward in history (undo)
    const conflictingConfigs = input.filter((i) => currentSet.has(i.id));
    conflictingConfigs.forEach((i) => h.backwardAdd(currentSet.get(i.id)!));

    // Event construction is complete.
    this.history.do(h);

    // Now that we've updated undo/redo history, write the changes.
    input.forEach((i) => currentSet.set(i.id, i));
    // The set of relevant parameters may have changed.
    this.findRelevantParameters();
  }

  // Adds the given SampleConfiguration objects to the set without doing any checking.
  // Used to build up an initial state.
  add(input: SampleConfiguration[]) {
    input.forEach((i) => this.configurationsById.set(i.id, i));
    // The set of relevant parameters may have changed.
    this.findRelevantParameters();
  }

  // Removes SampleConfigurations without doing any checking.
  // Note that if there is pending redo or edit history to catch up with,
  // this will have unpredictable effects.
  remove(ids: Guid[]) {
    ids.forEach((id) => { this.configurationsById.delete(id); });
    // The set of relevant parameters may have changed.
    this.findRelevantParameters();
  }

	undo() {
    const edit = this.history.undo();
    if (!edit) { return; }

    const currentSet = this.configurationsById;
    edit.additions.forEach((a) => {
      const s = a as SampleConfiguration;
      s.isValid = true;
      currentSet.set(s.id, s)
    });
    edit.deletions.forEach((a) => { currentSet.delete(a.id) });

    // The set of relevant parameters may have changed.
    this.findRelevantParameters();
	}

  redo() {
    const edit = this.history.redo();
    if (!edit) { return; }

    const currentSet = this.configurationsById;
    edit.additions.forEach((a) => {
      const s = a as SampleConfiguration;
      s.isValid = true;
      currentSet.set(s.id, s)
    });
    edit.deletions.forEach((a) => { currentSet.delete(a.id) });

    // The set of relevant parameters may have changed.
    this.findRelevantParameters();
	}

  canRedo(): boolean {
    return this.history.canRedo();
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  getPendingEdits(): EditQueueEntry | null {
    return this.history.getPendingEdits();
  }

  // Pulls items off the beginning of the edit queue
  // up to and including the item with the given index,
  // or just clears the whole queue is that index isn't present.
  catchUpToEdit(index:number) {
    return this.history.catchUpToEdit(index);
  }
}


// A set of sets of SampleConfigurations, and functions to manage them.
export class SampleConfigurationSets {
  id: Guid;
  name: string;
  setsById: Map<Guid, SampleConfigurationSet>;
  scanTypesCache?: ScanTypes;

  constructor(name: string, id: Guid) {
    this.id = id;
    this.name = name;
    this.setsById = new Map();
  }

  // Calls setScanTypes for all ConfigurationSets, passing the given ScanTypes along.
  setScanTypes(scanTypesCache: ScanTypes) {
    this.scanTypesCache = scanTypesCache;
    this.setsById.forEach((t) => t.setScanTypes(scanTypesCache));
  }

  // Adds the given SampleConfigurationSet objects to the set without doing any checking.
  // Used to build up an initial state.
  add(input: SampleConfigurationSet[]) {
    const t = this.scanTypesCache;
    input.forEach((c) => {
      if (t) { c.setScanTypes(t); }
      this.setsById.set(c.id, c);
    });
  }

  // Removes SampleConfigurationSets without doing any checking.
  remove(ids: Guid[]) {
    const t = this.scanTypesCache;
    ids.forEach((id) => { this.setsById.delete(id); });
  }

  getById(id: Guid): SampleConfigurationSet | undefined {
    return this.setsById.get(id);
  }

  generateUniqueNames(suggestedName: string, quantity?: number, startIndex?: number | null): string[] {
    let existingNames: string[] = [];
    this.setsById.forEach((v) => { existingNames.push(v.name) });
    return generateUniqueNames(existingNames, suggestedName, quantity, startIndex);
  }

  all() {
    return Array.from(this.setsById.values());
  }
}


