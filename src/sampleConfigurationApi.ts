import { Guid } from "./components/utils.tsx";
import { ResponseWrapper, sciCatGet, sciCatPost } from "./generalApi.ts";
import { ScanTypeName } from './scanTypes.ts';
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


// Test function.  SciCat returns '{}' from this, which is not very useful.
async function whoAmI(): Promise<ResponseWrapper<string>> {
  const result = await sciCatGet('auth/whoami',{});
  if (!result.success) {
    return { success: false, message: result.message };
  }
  const rawRecords:any = await result.response!.text();
  console.log("whoAmI result");
  console.log(rawRecords);
  return { success: true, response: rawRecords };
}


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
    if (!(s.sampleCharacteristics.lbnl_config_meta_valid)) { return; }
    // Separate the records into "set" and "configuration" buckets
    if (s.sampleCharacteristics.lbnl_config_meta_type == 'set') { rawSetRecords.push(s); }
    else if (s.sampleCharacteristics.lbnl_config_meta_type == 'configuration') { rawConfigRecords.push(s); }
  });

  // Add a new SampleConfigurationSet object for each record we got that looks like one.
  const sets = rawSetRecords.map((r) => {
    return new SampleConfigurationSet(
                    r.id as Guid,
                    r.sampleCharacteristics.lbnl_config_meta_description || "",
                    r.description );
  });

  var configs: SampleConfiguration[] = []; 

  rawConfigRecords.forEach((r) => {
    const sc = r.sampleCharacteristics;
    const setId = sc.lbnl_config_meta_set_id as Guid;
    if (!setId) { return; }

    const parameters:Map<Guid, string|null> = new Map();

    // Anything in sampleCharacteristics that starts with lbnl_config_ and not lbnl_config_meta_
    // is treated as a Scan Type parameter and its value is added to the parameter set.
    for (const [key, value] of Object.entries(sc)) {
      if (key.startsWith('lbnl_config_')) {
        if (!characeristicsToIgnore.has(key)) { 
          parameters.set(key.replace(/lbnl_config_/, '') as Guid, value as string);
        }
      }
    }

    const newConfig = new SampleConfiguration({
      id: r.id as Guid,
      setId: setId,
      mmFromLeftEdge: sc.lbnl_config_meta_mm_from_left_edge,
      name: r.description,
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
  console.log("create set result");
  console.log(result);

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


// Create a new Sample record on the server, with sampleCharacteristics set to identify it as
// a sample configuration.
async function createNewConfiguration(setId: Guid, name: string, description: string, scanType: string, mmFromLeftEdge: number, parameters: Map<Guid, string|null>): Promise<ResponseWrapper<SampleConfiguration>> {

  const body = {
    "description": name,
    "sampleCharacteristics": {
      "lbnl_config_meta_type": "configuration",
      "lbnl_config_meta_description": description,
      "lbnl_config_meta_set_id": setId,
      "lbnl_config_meta_scan_type": scanType,
      "lbnl_config_meta_valid": true
    },
    "isPublished": false,
    ownerGroup: "group1",
  };

  const result = await sciCatPost('samples', JSON.stringify(body));
  console.log("create configuration result");
  console.log(result);

  if (result.success) {
    const newRecord:any = await result.response!.json();
    const newConfig = new SampleConfiguration({
      id: newRecord.id as Guid,
      setId: setId,
      mmFromLeftEdge: mmFromLeftEdge,
      name: name,
      description: description,
      scanType: scanType as ScanTypeName,
      parameters: parameters
    });

    return { success: true, response: newConfig };
  }
  return { success: false, message: result.message };
}


export type { RecordsFromServer }
export { whoAmI, readConfigsForProposalId, createNewSet, createNewConfiguration }
