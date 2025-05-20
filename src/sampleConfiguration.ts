import { ScanTypes, ParamUid, ScanTypeName } from './scanTypes.ts';
import { Guid, sortWithNumberParsing, generateUniqueNames } from "./components/utils.tsx";
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
  // This can stay undefined until legitimate ScanType information is available.
  scanTypesReference!: ScanTypes;

  constructor(id: Guid, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.configurationsById = new Map();
    this.description = description;
    this.relevantParameters = [];
    this.history = new UndoHistory();
  }

  setScanTypes(scanTypesReference: ScanTypes) {
    this.scanTypesReference = scanTypesReference;
    this.findRelevantParameters();
  }

  getSortedSamples() {
    const sortedSamples = this.all().sort((a, b) => { return sortWithNumberParsing(a.name, b.name)});
    return sortedSamples;
  }

  // Look through all the current sample configurations for scan parameters,
  // and gather all the unique parameter names into a list, in the order encountered.
  // Used for deciding which parameter columns to render in the interface.
  findRelevantParameters() {
    const scanTypesByName = this.scanTypesReference.typesByName;
    let workingSet: Set<ParamUid> = new Set();
    let relevantParameters: ParamUid[] = [];

    // We default to sorting SampleConfiguration records by name,
    // since that's the default sort when displaying them.
    const sortedSamples = this.getSortedSamples();

    sortedSamples.forEach((v) => {
      if (!scanTypesByName.has(v.scanType)) { return; }
      const t = scanTypesByName.get(v.scanType)!;
      t.parameters.forEach((p) => {
        if (!workingSet.has(p.typeId)) {
          relevantParameters.push(p.typeId);
          workingSet.add(p.typeId);
        }
      });
    });
    this.relevantParameters = relevantParameters;
  }


  // Generate and return a series of c objects suitable for
  // sending to the server for the creation of new configurations in this set.
  // This includes creating default parameter values that respect uniqueness constraints
  // relative to the existing configurations in this set.
  generateNewConfigurationsWithDefaults(quantity: number, scanTypeName: ScanTypeName, suggestedName?: string, suggestedDescription?: string): SampleConfiguration[] {

    const scanTypesByName = this.scanTypesReference.typesByName;
    const parametersById = this.scanTypesReference.parametersById;
    const configsById = this.configurationsById;

    if (!scanTypesByName.has(scanTypeName)) { return []; }
    const scanType = scanTypesByName.get(scanTypeName)!;

    const uniqueNames = this.generateUniqueNames(suggestedName ?? "Sample", quantity);

    const parametersThatNeedUniqueValues = 
      scanType.parameters.filter((p) => {
        const parameterType = parametersById.get(p.typeId);
        return parameterType?.uniqueInSet
      });

    var uniqueParameterValues: Map<ParamUid, number[]> = new Map();

    // For each parameter that needs a unique value, create a list of acceptable values,
    // long enough to meet out quantity demand.
    parametersThatNeedUniqueValues.forEach((p) => {
      const parameterType = parametersById.get(p.typeId);
      var values = [];
      var index = 0;

      const interval = parseFloat((parameterType!.autoGenerateInterval || "1") as string);
      const defaultValue = parseFloat(p.default ?? parameterType!.default ?? "0");

      // We're starting with the default, but if there are any existing configs,
      // we check their parameters for a value and, if it's higher than what we already have,
      // we use that (plus the interval) as the starting point.
      var value = defaultValue;
      configsById.forEach((c) => {
        const paramValue = parseFloat(c.parameters.get(parameterType!.id) ?? "");
        if (!isNaN(paramValue)) { value = Math.max(paramValue+interval, value); }
      });

      // Create an array of values, separated by the interval
      while (index < quantity) {
        values.push(value);
        value += interval;
        index++;
      }
      uniqueParameterValues.set(parameterType!.id, values);
    });

    var newConfigs: SampleConfiguration[] = [];
    var index = 0;
    while (index < quantity) {

      // Make a set of parameters for the chosen ScanType, with default or blank values.
      const parameters:Map<ParamUid, string|null> = new Map();
      scanType.parameters.forEach((p) => {
        const parameterType = parametersById.get(p.typeId);
        if (parameterType) { parameters.set(parameterType.id, p.default ?? parameterType.default ?? ""); }
      });
      // For all the parameters that need unique defaults, select one from our prepared arrays.
      parametersThatNeedUniqueValues.forEach((p) => {
        const uniqueValues = uniqueParameterValues.get(p.typeId) as number[];
        const v = uniqueValues[index];
        parameters.set(p.typeId, `${v}`)
      });

      newConfigs.push(
        new SampleConfiguration({
          id: "" as Guid,
          setId: this.id,
          name: uniqueNames[index],
          isValid: true,
          description: suggestedDescription || "",
          scanType: scanType.name,
          parameters: parameters
        })
      );
      index++;
    }
    return newConfigs;
  }


  generateUniqueNames(suggestedName: string, quantity?: number, startIndex?: number | null): string[] {
    let existingNames: string[] = [];
    this.configurationsById.forEach((v) => { existingNames.push(v.name) });

    return generateUniqueNames(existingNames, suggestedName, quantity, startIndex);
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


