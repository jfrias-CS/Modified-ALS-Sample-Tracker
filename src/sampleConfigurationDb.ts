import { Guid } from "./components/utils.tsx";


// Database interconnection functions for SampleConfiguration objects.

interface ResponseWrapper<Data> {
  success: boolean;
  response?: Data;
  message?: string;
}


interface NewSet {
    id: Guid,
    name: string,
    description: string
}


interface NewConfiguration {
    id: Guid,
    setId: Guid,
    name: string,
    description: string
}


// This interface defines the records we expect to get from the server when fetching saved data
interface RecordFromServer {
  id: string,
  description: string,
  createdAt: string,
  updatedAt: string,
  // All remaining metadata, including parameters and flags to distinguish this record between
  // a configuration and a set, is held in sampleCharacteristics.
  sampleCharacteristics: any
}


// Somewhere up here we need an authentication check that looks for a cookie containing the bearer token given to us post-authentication.
// If the cookie is missing, it needs to look for a token (jwt) in the encoded fields of the URL.
// If the token exists it should be extracted and saved as a cookie, and the load should proceed.
// If there is no cookie and no JWT, we should redirect to a login URL, with a post-load ridirect given as the
// original requested URL, e.g:
//    const loginUrl = new URL(urls.ALS_AUTH_URL + "/login");
//    loginUrl.searchParams.append("return_to", window.location.toString());
//    window.location.href = loginUrl.toString();


async function get(url: string, params: Record<string, string>): Promise<ResponseWrapper<Response>> {
  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzQwZWI1NWNlNTRlMTU0NjUzYWNhMjEiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJzY2ljYXRhZG1pbkB5b3VyLnNpdGUiLCJhdXRoU3RyYXRlZ3kiOiJsb2NhbCIsIl9fdiI6MCwiaWQiOiI2NzQwZWI1NWNlNTRlMTU0NjUzYWNhMjEiLCJpYXQiOjE3MzI3NTU3MzksImV4cCI6MTczMjc1OTMzOX0.hlxNo0iJdCddnx7q0M4CvXWq2zNpzX5sGWJDMDd3XRs';
  const requestInit: RequestInit = {
    method: "GET",
    headers: { 'Authorization': "Bearer " + jwt }
  };
  const queryString = new URLSearchParams(params);
  const requestInfo: RequestInfo = new Request(`http://backend.localhost/api/v3/${url}?${queryString}`, requestInit );
  const response = await fetch(requestInfo);
  return { success: true, response: response };
}


async function post(url: string, body: string): Promise<ResponseWrapper<Response>> {
  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzQwZWI1NWNlNTRlMTU0NjUzYWNhMjEiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJzY2ljYXRhZG1pbkB5b3VyLnNpdGUiLCJhdXRoU3RyYXRlZ3kiOiJsb2NhbCIsIl9fdiI6MCwiaWQiOiI2NzQwZWI1NWNlNTRlMTU0NjUzYWNhMjEiLCJpYXQiOjE3MzI3NTU3MzksImV4cCI6MTczMjc1OTMzOX0.hlxNo0iJdCddnx7q0M4CvXWq2zNpzX5sGWJDMDd3XRs';

  try {

    const requestInit: RequestInit = {
      method: "POST",
      headers: {
        'Authorization': "Bearer " + jwt,
        'Content-Type': 'application/json'
      },
      body: body
    };
    const requestInfo: RequestInfo = new Request('http://backend.localhost/api/v3/' + url, requestInit );

    const response = await fetch(requestInfo);

    if (response.status == 201 || response.status == 200) {
      return { success: true, response: response };
    } else {
      return { success: false, response: response, message: "Error" };
    }
  } catch (err) {

    return { success: false, message: "Exception" };
  }
}


async function readConfigsForProposalId(proposalId: string): Promise<ResponseWrapper<RecordFromServer[]>> {

  const params = {
    filter: `{"where":{"ownerGroup": "${proposalId}" }}`
  };

  const result = await get('samples', params);
  if (result.success) {
    const records:any = await result.response!.json();
    return { success: true, response: records };
  }
  return { success: false, message: result.message };
}


async function createNewSet(name: string, description: string): Promise<ResponseWrapper<NewSet>> {

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
 
  const result = await post('samples', JSON.stringify(body));
  console.log("create set result");
  console.log(result);

  if (result.success) {
    const newRecord:any = await result.response!.json();
    const newSet:NewSet = {
      id: newRecord.id as Guid,
      name: name,
      description: description
    };
    return { success: true, response: newSet };
  }
  return { success: false, message: result.message };
}


async function createNewConfiguration(setId: Guid, name: string, description: string, scanType: string): Promise<ResponseWrapper<NewConfiguration>> {

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

  const result = await post('samples', JSON.stringify(body));
  console.log("create configuration result");
  console.log(result);

  if (result.success) {
    const newRecord:any = await result.response!.json();
    const newConfiguration:NewConfiguration = {
      id: newRecord.id as Guid,
      setId: setId,
      name: name,
      description: description
    };

    return { success: true, response: newConfiguration };
  }
  return { success: false, message: result.message };
}


export type { RecordFromServer }
export { readConfigsForProposalId, createNewSet, createNewConfiguration }
