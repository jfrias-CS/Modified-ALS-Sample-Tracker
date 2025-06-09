import { Guid } from "./components/utils.tsx";
import { ResponseWrapper, sciCatPatch } from "./sciCatBasicApi.ts";
import { SciCatSample, createSample, getSamplesForGroupId, deleteSample } from "./sciCatApi.ts";
import { ScanTypeName, ParamUid } from './scanTypeDto.ts';
import { SampleConfiguration, SampleConfigurationSet } from './sampleConfiguration.ts';


// Functions providing translation between SciCat's native "Sample" records,
// and our SampleConfiguration / SampleConfigurationSet objects.

// The majority of the translation is based on using the "sampleCharacteristics" property
// that SciCat provides for conveying arbitrary JSON structures.


// This is returned by a successful fetch of all current records for a given proposal from SciCat
interface RecordsFromServer {
  configs: SampleConfiguration[],
  sets: SampleConfigurationSet[]
}


//
// Describing our SampleConfiguration data as it's being stored as SciCat data:
//

// We use an enum inside "sampleCharacteristics" to distinguish between our Configuration and Set objects.
enum AlsSampeTrackingObjectType {
  Set = "set",
  Configuration = "configuration",
}

// The complete structure of our section of the custom JSON "sampleCharacteristics" property.
interface AlsSampleTrackingObject {
  type: AlsSampeTrackingObjectType,
  description: string,
  set_id: string,
  scan_type: ScanTypeName,
  valid: boolean,
  parameters: { [key: string]: string|null }
};

// We keep our data under one property inside "sampleCharacteristics", to (try to) make it disinct
// from other arbitrary metadata that might be placed there by other applications.
interface SampleCharacteristicsContent {
  als_sample_tracking?: AlsSampleTrackingObject;
}

// Here we extend the standard SciCatSample interface, overriding the
// sampleCharacteristics property so it explicitly contains our als_sample_tracking property.
// This enforces good type checking in the following code.
interface SciCatSampleAsAlsSampleTracking extends SciCatSample {
  sampleCharacteristics?: SampleCharacteristicsContent;
}


//
// Functions to turn basic C/R/U/D operations into equivalent SciCat operations
//

// Fetch all the Set/Sample records that are owned up the given proposalId (i.e. ownerGroup),
// and instantiate them into SampleConfigurationSet and SampleConfiguration records.
// Note that if the user is not authenticated, SciCat quietly succeeds with an empty list,
// so authentication status need to be confirmed before this call is useful.
async function readConfigsForProposalId(proposalId: string): Promise<ResponseWrapper<RecordsFromServer>> {

  const result = await getSamplesForGroupId(proposalId);
  if (!result.success) {
    return { success: false, message: result.message };
  }
  // From now on we're going to expect these to be our more narrowly defined type.
  const rawRecords = result.response! as SciCatSampleAsAlsSampleTracking[];

  var rawSetRecords:SciCatSampleAsAlsSampleTracking[] = [];
  var rawConfigRecords:SciCatSampleAsAlsSampleTracking[] = [];
  rawRecords.forEach((s) => {
    // Skip any records that don't have a sampleCharacteristics object, or a als_sample_tracking object within.
    // They will definitely not contain enough information to be useful.
    if (!s.sampleCharacteristics?.als_sample_tracking) { return; }
    // Skip any records that claim to be invalid.
    // These may be detritus from incomplete undo purging in a previous session.
//    if (!(s.sampleCharacteristics.als_sample_tracking.valid)) { return; }
    // Separate the records into "set" and "configuration" buckets
    if (s.sampleCharacteristics.als_sample_tracking.type == AlsSampeTrackingObjectType.Set) {
      rawSetRecords.push(s);
    } else if (s.sampleCharacteristics.als_sample_tracking.type == AlsSampeTrackingObjectType.Configuration) {
      rawConfigRecords.push(s);
    }
  });

  // Add a new SampleConfigurationSet object for each record we got that looks like one.
  const sets = rawSetRecords.map((r) => {
    return new SampleConfigurationSet(
                    r.id as Guid,
                    r.description || '',
                    r.sampleCharacteristics!.als_sample_tracking!.valid || false,
                    r.sampleCharacteristics!.als_sample_tracking!.description || "" );
  });

  const configs = rawConfigRecords.filter((r) => {
      // All these fields must exist with a non-null non-zero set_id at the bottom,
      // or we cannot use this record.
      return r?.sampleCharacteristics?.als_sample_tracking?.set_id;
    }).map((r) => {
      // All remaining metadata, including parameters and flags to distinguish this record between
      // a configuration and a set, is held in sampleCharacteristics.
      const sc = r.sampleCharacteristics!.als_sample_tracking!;
      const setId = sc.set_id as Guid;

      // Anything in sampleCharacteristics.als_sample_tracking.parameters 
      // is treated as a Scan Type parameter and its value is added to the parameter set.
      const newConfig = new SampleConfiguration({
        id: r.id as Guid,
        setId: setId,
        name: r.description || '',
        isValid: sc.valid,
        description: sc.description,
        scanType: sc.scan_type,
        parameters: sc.parameters
      });

      return newConfig;
    });

  const records = {
    sets: sets,
    configs: configs
  }

  return { success: true, response: records };
}


// Create a new Sample record on the server, with sampleCharacteristics set to identify it as
// a sample configuration set.
async function createNewSet(proposalId: string, name: string, description: string): Promise<ResponseWrapper<SampleConfigurationSet>> {

  const sample:SciCatSample = {
    "description": name,
    "sampleCharacteristics": {
      "als_sample_tracking": {
        "type": AlsSampeTrackingObjectType.Set,
        "description": description,
        "valid": true
      }
    },
    "isPublished": false,
    "ownerGroup": proposalId,
  };
 
  const result = await createSample(sample);

  if (result.success) {
    const newSet = new SampleConfigurationSet(
      result.response!.id as Guid,
      name,
      true,
      description
    );
    return { success: true, response: newSet };
  }
  return { success: false, message: result.message };
}


// Delete a Configuration from the server, returning the Id used if successful.
async function deleteConfiguration(configId: Guid): Promise<ResponseWrapper<Guid>> {
  return deleteSample(configId);
}

// Delete a Set from the server, returning the Id used if successful.
// Note:  This operation does not check if there are any Configurations belonging to the set!
// Those should be deleted first.
async function deleteSet(setId: Guid): Promise<ResponseWrapper<Guid>> {
  return deleteSample(setId);
}


// Create a new Sample record on the server, with sampleCharacteristics set to identify it as
// a sample configuration.
async function createNewConfiguration(proposalId: string, setId: Guid, name: string, description: string, scanType: ScanTypeName, parameters: Map<ParamUid, string|null>): Promise<ResponseWrapper<SampleConfiguration>> {

  // All sampleCharacteristics values need to be specified in the patch operation.
  // The server will erase any that are left out.
  var alsSampleTracking:AlsSampleTrackingObject = {
      "type": AlsSampeTrackingObjectType.Configuration,
      "description": description,
      "set_id": setId,
      "scan_type": scanType,
      "valid": true,
      "parameters": {}
  };

  parameters.forEach((v, k) => {
    alsSampleTracking.parameters[k] = v;
  });

  const sample:SciCatSample = {
    "description": name,
    "sampleCharacteristics": {
      "als_sample_tracking": alsSampleTracking
    },
    "isPublished": false,
    ownerGroup: proposalId
  };

  const result = await createSample(sample);

  if (result.success) {
    const newConfig = new SampleConfiguration({
      id: result.response!.id as Guid,
      setId: setId,
      name: name,
      isValid: true,
      description: description,
      scanType: scanType as ScanTypeName,
      parameters: alsSampleTracking.parameters
    });

    return { success: true, response: newConfig };
  }
  return { success: false, message: result.message };
}


// Updates the record on the server that matches the given SampleConfigurationSet's Id,
// making their fields match.
// That this does not update the SampleConfigurations the set contains.
async function updateSet(set: SampleConfigurationSet): Promise<ResponseWrapper<SampleConfigurationSet>> {

  // All sampleCharacteristics values need to be specified here.
  // The server will erase any that are left out of the patch operation.
  const body = {
    "description": set.name,
    "sampleCharacteristics": {
      "als_sample_tracking": {
        "type": AlsSampeTrackingObjectType.Set,
        "description": set.description,
        "valid": set.isValid
      }
    }
  };

  const result = await sciCatPatch(`samples/${set.id}`, JSON.stringify(body));

  if (result.success) {
    const body:any = await result.response!.json();
    return { success: true, response: set };
  }
  return { success: false, message: result.message };
}


// Updates the record on the server that matches the given SampleConfiguration's Id,
// making their fields match.
async function updateConfig(config: SampleConfiguration): Promise<ResponseWrapper<SampleConfiguration>> {

  // All sampleCharacteristics values need to be specified in the patch operation.
  // The server will erase any that are left out.
  var alsSampleTracking:AlsSampleTrackingObject = {
      "type": AlsSampeTrackingObjectType.Configuration,
      "description": config.description,
      "set_id": config.setId,
      "scan_type": config.scanType,
      "valid": config.isValid,
      "parameters": {}
  };

  config.parameters.forEach((v, k) => {
    alsSampleTracking.parameters[k] = v;
  });

  const body = {
    "description": config.name,
    "sampleCharacteristics": {
      "als_sample_tracking": alsSampleTracking
    }
  };

  const result = await sciCatPatch(`samples/${config.id}`, JSON.stringify(body));
//  console.log("patch result");
//  console.log(result);

  if (result.success) {
    const body:any = await result.response!.json();
  //  console.log(body);
    return { success: true, response: config };
  }
  return { success: false, message: result.message };
}


export type { RecordsFromServer }
export { readConfigsForProposalId, createNewSet, createNewConfiguration, updateSet, updateConfig, deleteSet, deleteConfiguration }
