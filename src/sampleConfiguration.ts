import { ScanTypes, ScanTypeName, ScanType } from './scanTypes.ts';
import { Guid, generateUniqueIds, generateUniqueNames } from "./components/utils.tsx";

// Class definitions to represent sample configurations,
// sets of sample configurations, and undo/redo history for changes
// to those sets.


export interface SampleConfiguration {
  // A unique identifier either generated on the server, or generated locally.
  id: Guid;
  // If true, the identifier was generated client-side and this record still needs to be created server-side.
  // If false, the idenfitier was generated on the server and can be used for write operations.
  idIsClientGenerated: boolean;
  // Intended to be short and unique, but this is not strictly enforced.
  name: string;
  // Intended to be a unique number, but not enforced, for editing convenience.
  mmFromLeftEdge: number;
  // Meant to be longer than the name.  Can be blank.
  description: string;
  scanType: ScanTypeName;
  // Key/value parameter set. Keys should only be valid for the chosen ScanType.
  // This is not strictly enforced, so old inapplicable values can be preserved
  // in case a previous ScanType selection is re-selected.
  parameters: { [key: Guid]: string|null }
}


// Represents one set of changes to content of a SampleConfigurationSet
class SampleConfigurationSetChanges {

  preferNewer: boolean;
  additions: Array<SampleConfiguration>;
  deletions: Array<Guid>;

	constructor (preferNewer: boolean) {
		this.preferNewer = preferNewer;
    this.additions = [];
    this.deletions = [];
	}

	newAddition(addition: SampleConfiguration) {
		if (this.preferNewer) {
			// Remove any previous change before pushing.
			var c =
				this.additions.filter((item) => (item.id != addition.id));
			c.push(addition);
			this.additions = c;
		} else {
			// Only push the change if there isn't one for that ID already
			var s =
				this.additions.some((item) => (item.id == addition.id));
			if (!s) {
				this.additions.push(addition);
			}
		}
	}

  newDeletion(deletion: Guid) {
    var s =
      this.deletions.some(function(item) {
        if (deletion == item) { return true; } else { return false; }
      });
    if (!s) {
      this.deletions.push(deletion);
    }
	}

  asSelection() {
		return this.additions.map(function(item) {
	      return item.id;
		});
	}

	isEmpty() {
		if (this.additions.length > 0) { return false; }
		if (this.deletions.length > 0) { return false; }
		return true;
	}
}


// Pairs one set of changes to a SampleConfigurationSet,
// with a copy of the contents that were altered by the changes.
// These can be used to move forward and backward in the history of edits.
class UndoHistoryEntry {

  oldChanges: SampleConfigurationSetChanges;
  newChanges: SampleConfigurationSetChanges;

	constructor () {
    	this.oldChanges = new SampleConfigurationSetChanges(false);
      this.newChanges = new SampleConfigurationSetChanges(true);
	}

  isEmpty() {
		if (!this.oldChanges.isEmpty()) { return false; }
		if (!this.newChanges.isEmpty()) { return false; }
		return true;
	}
}


// A history of modifications to a SampleConfigurationSet.
// Contains a queue for sending modifications to a server, and stacks for undo/redo on the client.
class UndoHistory {

  undoHistory: UndoHistoryEntry[];
  redoHistory: UndoHistoryEntry[];

  constructor () {
		this.undoHistory = [];
		this.redoHistory = [];
	}

	addEvent(entry: UndoHistoryEntry) {
		this.undoHistory.push(entry);
		// Adding a new event (as opposed to Redo-ing one) always clears the Redo stack.
		this.redoHistory = [];
	}

	undo() {
		if (this.undoHistory.length < 1) { return null; }    
    const u = this.undoHistory.pop()!;
		this.redoHistory.push(u);
		return u.oldChanges;
	}

  redo() {
    if (this.redoHistory.length < 1) { return null; }
    const r = this.redoHistory.pop()!;
		this.undoHistory.push(r);
		return r.newChanges;
	}
}


export class SampleConfigurationSet {
  id: Guid;
  name: string;
  // If true, the identifier was generated client-side and this record still needs to be created server-side.
  // If false, the idenfitier was generated on the server and can be used for write operations.
  idIsClientGenerated: boolean;
  // Can remain empty
  description: string;
  configurationsById: Map<string, SampleConfiguration>;
  // A sorted array of the unique names of all parameters used
  // by the ScanTypes of all current SampleConfigurations.
  relevantParameters: Array<Guid>;
  // Undo/redo history tracker
  history: UndoHistory;
  // A cached value used as a reference by e.g. findRelevantParameters.
  // This can be unfedined until legitimate ScanType information is available.
  scanTypesByName!: Map<ScanTypeName, ScanType>;

  constructor(name: string, description: string, id: Guid, idIsClientGenerated: boolean) {
    this.id = id;
    this.name = name;
    this.idIsClientGenerated = idIsClientGenerated;
    this.configurationsById = new Map();
    this.description = description;
    this.relevantParameters = [];
    this.history = new UndoHistory();
  }

  setScanTypes(scanTypesCache: ScanTypes) {
    this.scanTypesByName = new Map();
    scanTypesCache.types.forEach((t) => this.scanTypesByName.set(t.name, t));
    this.findRelevantParameters();
  }

  // Look through all the current sample configurations for scan parameters,
  // and gather all the unique parameter names into a sorted list.
  // Used for rendering the proper columns in the interface.
  findRelevantParameters() {
    const scanTypesByName = this.scanTypesByName;
    let workingSet: Set<Guid> = new Set();
    this.configurationsById.forEach((v) => {
      if (!scanTypesByName.has(v.scanType)) { return; }
      const t = scanTypesByName.get(v.scanType)!;
      t.parameters.forEach((p) => workingSet.add(p));      
    });
    this.relevantParameters = Array.from(workingSet).sort();
  }

  addOrReplace(input:SampleConfiguration[]) {

    const h = new UndoHistoryEntry();
    const currentSet = this.configurationsById;

    const newIds = input.filter((i) => !currentSet.has(i.id)).map((i) => i.id);
    const conflictingIds = input.filter((i) => currentSet.has(i.id)).map((i) => i.id);

    // Every given SampleConfiguration is a new change in forward history
    input.forEach((i) => h.newChanges.newAddition(i));
    // Every SampleConfiguration in the existing set that's replaced by a new one
    // should be preserved and restored if we go backward in history (undo)
    conflictingIds.forEach((i) => h.oldChanges.newAddition(currentSet.get(i)!));    
    // Every given SampleConfiguration with a novel id (not seen in the current set)
    // should be removed if we go backward in history (undo)
    newIds.forEach((i) => h.oldChanges.newDeletion(i));
    // Event construction is complete.
    this.history.addEvent(h);

    // Now that we've updated undo/redo history, write the changes.
    input.forEach((i) => currentSet.set(i.id, i));
    // The set of relevant parameters may have changed.
    this.findRelevantParameters();
  }

  generateUniqueNames(suggestedName: string, quantity?: number, startIndex?: number | null): string[] {
    let existingNames: string[] = [];
    this.configurationsById.forEach((v) => { existingNames.push(v.name) });

    return generateUniqueNames(existingNames, suggestedName, quantity, startIndex);
  }

  // Generate an ID number that is guaranteed to not exist in
  // the current sample set.
  generateUniqueIds(quantity?: number) {
    var currentIds: Guid[] = [];
    this.configurationsById.forEach((v) => { if (v.idIsClientGenerated) { currentIds.push(v.id); }});
    return generateUniqueIds(currentIds, quantity);
  }

  // Generate bar locations that are at least 10mm beyond the current
  // rightmost sample location, and 10mm apart from each other.
  generateOpenLocations(quantity?: number) {
    var chosenQuantity = Math.max(quantity||1, 1);

    var maxUniqueLocation = 0;
    this.configurationsById.forEach((v) => {
      maxUniqueLocation = Math.max(v.mmFromLeftEdge, maxUniqueLocation);
    });

    maxUniqueLocation += 10;

    var goodLocations: number[] = [];
    while (chosenQuantity > 0) {
      goodLocations.push(maxUniqueLocation);
      maxUniqueLocation += 10;
      chosenQuantity--;
    }
    return goodLocations;
  }

  all() {
    return Array.from(this.configurationsById.values());
  }
}


// A set of sets of SampleConfigurations, and functions to manage them.
export class SampleConfigurationSets {
  id: Guid;
  idIsClientGenerated: boolean
  name: string;
  setsById: Map<Guid, SampleConfigurationSet>;
  scanTypesCache?: ScanTypes;

  constructor(name: string, id: Guid, idIsClientGenerated: boolean) {
    this.id = id;
    this.idIsClientGenerated = idIsClientGenerated;
    this.name = name;
    this.setsById = new Map();
  }

  // Calls setScanTypes for all ConfigurationSets, passing the given ScanTypes along.
  setScanTypes(scanTypesCache: ScanTypes) {
    this.scanTypesCache = scanTypesCache;
    this.setsById.forEach((t) => t.setScanTypes(scanTypesCache));
  }

  newSet(name?: string, description?: string, id?: Guid): SampleConfigurationSet {
    const thisId = id || this.generateUniqueIds()[0];
    const uniqueName = this.generateUniqueNames(name || "set")[0];
    const c = new SampleConfigurationSet( uniqueName, description || "", thisId, true );
    if (this.scanTypesCache) {
      c.setScanTypes(this.scanTypesCache);
    }
    this.setsById.set(thisId, c);
    return c;
  }

  generateUniqueNames(suggestedName: string, quantity?: number, startIndex?: number | null): string[] {
    let existingNames: string[] = [];
    this.setsById.forEach((v) => { existingNames.push(v.name) });
    return generateUniqueNames(existingNames, suggestedName, quantity, startIndex);
  }

  // Generate an ID number that is guaranteed to not exist in
  // the current sample sets.
  generateUniqueIds(quantity?: number) {
    var currentIds: Guid[] = [];
    this.setsById.forEach((v) => { if (v.idIsClientGenerated) { currentIds.push(v.id); } });
    return generateUniqueIds(currentIds, quantity);
  }

  all() {
    return Array.from(this.setsById.values());
  }
}


