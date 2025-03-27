import { Guid } from "./components/utils.tsx";
import { ResponseWrapper, sciCatGet, sciCatPost, sciCatDelete, sciCatPatch } from "./sciCatBasicApi.ts";
import { SciCatUserIdentity, getUserDetails, deleteSample } from "./sciCatApi.ts";
import { ScanTypeName, ParamUid } from './scanTypes.ts';
import { SampleConfiguration, SampleConfigurationSet } from './sampleConfiguration.ts';


// Database interconnection functions for SampleConfiguration objects.


// This interface defines the records we expect to get from the server when fetching saved data
interface RawRecordFromServer {
  id: string,
  description: string,
  createdAt: string,
  updatedAt: string,
  // All remaining metadata, including parameters and flags to distinguish this record between
  // a configuration and a set, is held in sampleCharacteristics.
  sampleCharacteristics: any
}


// Returned by a successful fetch of all current records for a given proposal from the server
interface RecordsFromServer {
  configs: SampleConfiguration[],
  sets: SampleConfigurationSet[]
}


// Everything else in the sampleCharacteristics object that's prefixed with "lbnl_config_",
// but not mentioned here, is treated as the name of a Scan Type parameter.
const characeristicsToIgnore: Set<string> = new Set(
  ["lbnl_config_meta_type", "lbnl_config_meta_valid", "lbnl_config_meta_description", "lbnl_config_meta_set_id",
    "lbnl_config_meta_scan_type", "lbnl_config_meta_mm_from_left_edge"]
);


// Fetch all the Set/Sample records that are owned up the given proposalId (i.e. ownerGroup),
// and instantiate them into SampleConfigurationSet and SampleConfiguration records.
// Note that if the user is not authenticated, SciCat quietly succeeds with an empty list,
// so authentication status need to be confirmed before this call is useful.
async function readConfigsForProposalId(proposalId: string): Promise<ResponseWrapper<RecordsFromServer>> {

  const params = {
    filter: `{"where":{"ownerGroup": "${proposalId}" }}`
  };
  const result = await sciCatGet('samples', params);

  // More sophisticated query structure - not needed
//  const params = {
//    fields: `{"characteristics": [{"lhs":"ownerGroup","relation":"EQUAL_TO_STRING","rhs":"${proposalId}"}]}`
//  };
//  const result = await sciCatGet('samples', params);

  if (!result.success) {
    return { success: false, message: result.message };
  }
  const rawRecords:any = await result.response!.json();

  var rawSetRecords:RawRecordFromServer[] = [];
  var rawConfigRecords:RawRecordFromServer[] = [];
  rawRecords.forEach((s:RawRecordFromServer) => {
    // Skip any records that don't have a sampleCharacteristics object.
    // They will definitely not contain enough information to be useful.
    if (!s.sampleCharacteristics) { return; }
    // Skip any records that claim to be invalid.
    // These may be detritus from incomplete undo purging in a previous session.
//    if (!(s.sampleCharacteristics.lbnl_config_meta_valid)) { return; }
    // Separate the records into "set" and "configuration" buckets
    if (s.sampleCharacteristics.lbnl_config_meta_type == 'set') { rawSetRecords.push(s); }
    else if (s.sampleCharacteristics.lbnl_config_meta_type == 'configuration') { rawConfigRecords.push(s); }
  });

  // Add a new SampleConfigurationSet object for each record we got that looks like one.
  const sets = rawSetRecords.map((r) => {
    return new SampleConfigurationSet(
                    r.id as Guid,
                    r.description,
                    r.sampleCharacteristics.lbnl_config_meta_description || "" );
  });

  var configs: SampleConfiguration[] = []; 

  rawConfigRecords.forEach((r) => {
    const sc = r.sampleCharacteristics;
    const setId = sc.lbnl_config_meta_set_id as Guid;
    if (!setId) { return; }

    const parameters:Map<ParamUid, string|null> = new Map();

    // Anything in sampleCharacteristics that starts with lbnl_config_ and not lbnl_config_meta_
    // is treated as a Scan Type parameter and its value is added to the parameter set.
    for (const [key, value] of Object.entries(sc)) {
      if (key.startsWith('lbnl_config_')) {
        if (!characeristicsToIgnore.has(key)) { 
          parameters.set(key.replace(/lbnl_config_/, '') as ParamUid, value as string);
        }
      }
    }

    const newConfig = new SampleConfiguration({
      id: r.id as Guid,
      setId: setId,
      name: r.description,
      isValid: true,
      mmFromLeftEdge: sc.lbnl_config_meta_mm_from_left_edge,
      description: sc.lbnl_config_meta_description,
      scanType: sc.lbnl_config_meta_scan_type,
      parameters: parameters
    });

    configs.push(newConfig);
  });

  const records = {
    sets: sets,
    configs: configs
  }

  return { success: true, response: records };
}


// Create a new Sample record on the server, with sampleCharacteristics set to identify it as
// a sample configuration set.
async function createNewSet(name: string, description: string): Promise<ResponseWrapper<SampleConfigurationSet>> {

  const body = {
    "description": name,
    "sampleCharacteristics": {
      "lbnl_config_meta_type": "set",
      "lbnl_config_meta_description": description,
      "lbnl_config_meta_valid": true
    },
    "isPublished": false,
    ownerGroup: "group1",
  };
 
  const result = await sciCatPost('samples', JSON.stringify(body));

  if (result.success) {
    const newRecord:any = await result.response!.json();
    const newSet = new SampleConfigurationSet(
      newRecord.id as Guid,
      name,
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
async function createNewConfiguration(setId: Guid, name: string, description: string, scanType: string, mmFromLeftEdge: number, parameters: Map<ParamUid, string|null>): Promise<ResponseWrapper<SampleConfiguration>> {

  // All sampleCharacteristics values need to be specified in the patch operation.
  // The server will erase any that are left out.
  var sampleCharacteristics: { [key: string]: string|null|boolean } = {
    "lbnl_config_meta_type": "configuration",
    "lbnl_config_meta_mm_from_left_edge": mmFromLeftEdge.toString(),
    "lbnl_config_meta_description": description,
    "lbnl_config_meta_set_id": setId,
    "lbnl_config_meta_scan_type": scanType,
    "lbnl_config_meta_valid": true
  };
  parameters.forEach((v, k) => {
    sampleCharacteristics['lbnl_config_' + k] = v;
  });

  const body = {
    "description": name,
    "sampleCharacteristics": sampleCharacteristics,
    "isPublished": false,
    ownerGroup: "group1",
  };

  const result = await sciCatPost('samples', JSON.stringify(body));

  if (result.success) {
    const newRecord:any = await result.response!.json();
    const newConfig = new SampleConfiguration({
      id: newRecord.id as Guid,
      setId: setId,
      name: name,
      isValid: true,
      mmFromLeftEdge: mmFromLeftEdge,
      description: description,
      scanType: scanType as ScanTypeName,
      parameters: parameters
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
      "lbnl_config_meta_type": "set",
      "lbnl_config_meta_description": set.description,
      "lbnl_config_meta_valid": true
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
  var sampleCharacteristics: { [key: string]: string|null|boolean } = {
    "lbnl_config_meta_type": "configuration",
    "lbnl_config_meta_description": config.description,
    "lbnl_config_meta_mm_from_left_edge": config.mmFromLeftEdge.toString(),
    "lbnl_config_meta_set_id": config.setId,
    "lbnl_config_meta_scan_type": config.scanType,
    "lbnl_config_meta_valid": config.isValid
  };
  config.parameters.forEach((v, k) => {
    sampleCharacteristics['lbnl_config_' + k] = v;
  });

  const body = {
    "description": config.name,
    "sampleCharacteristics": sampleCharacteristics
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
