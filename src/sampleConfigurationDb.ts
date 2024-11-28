import { ScanTypes } from './scanTypes.ts';
import { SampleConfigurationSets } from './sampleConfiguration.ts';
import { Guid } from "./components/utils.tsx";


// Database interconnection functions for SampleConfiguration objects.


interface NewSet {
    id: Guid,
    name: string,
    description: string
}


// These three interfaces define the records we expect to get from the server when fetching real data
interface ConfigFromServer {
  name: string,
  id: string,
  mmFromLeftEdge: string,
  description: string,
  scanType: string,
  parameters: { [key: string]: string|null }
}

interface SetFromServer {
  name: string,
  description: string,
  id: string,
  configs: ConfigFromServer[]
}

interface SetsFromServer {
  name: string,
  proposalId: string,
  sets: SetFromServer[]
}


// Somewhere up here we need an authentication check that looks for a cookie containing the bearer token given to us post-authentication.
// If the cookie is missing, it needs to look for a token (jwt) in the encoded fields of the URL.
// If the token exists it should be extracted and saved as a cookie, and the load should proceed.
// If there is no cookie and no JWT, we should redirect to a login URL, with a post-load ridirect given as the
// original requested URL, e.g:
//    const loginUrl = new URL(urls.ALS_AUTH_URL + "/login");
//    loginUrl.searchParams.append("return_to", window.location.toString());
//    window.location.href = loginUrl.toString();



async function readConfigsForProposalId(proposalId: string) {

  const requestInit: RequestInit = {
    method: "GET",
//    headers: [["Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzAzNjIxODA3NzM0YjYxYmJkNzRiOWIiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJzY2ljYXRhZG1pbkB5b3VyLnNpdGUiLCJhdXRoU3RyYXRlZ3kiOiJsb2NhbCIsIl9fdiI6MCwiaWQiOiI2NzAzNjIxODA3NzM0YjYxYmJkNzRiOWIiLCJpYXQiOjE3MzIyMjc3NjMsImV4cCI6MTczMjIzMTM2M30.PDAN6zKgYiJ5iPgn1tBOJBAI5987uRXm3fTPZxIwfqA"]]
    headers: [["Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzQwZWI1NWNlNTRlMTU0NjUzYWNhMjEiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJzY2ljYXRhZG1pbkB5b3VyLnNpdGUiLCJhdXRoU3RyYXRlZ3kiOiJsb2NhbCIsIl9fdiI6MCwiaWQiOiI2NzQwZWI1NWNlNTRlMTU0NjUzYWNhMjEiLCJpYXQiOjE3MzI3NTU3MzksImV4cCI6MTczMjc1OTMzOX0.hlxNo0iJdCddnx7q0M4CvXWq2zNpzX5sGWJDMDd3XRs"]]

  };

  const url = 'http://backend.localhost/api/v3/samples';
  const params = {
  //          fields: '{"text":"1", "metadataKey": "proposalId", "characteristics": [{"lhs":"proposalId","relation":"EQUAL_TO_STRING","rhs":"1"}]}'
    filter: '{"where":{"ownerGroup": "group1" }}'
  };

  const queryString = new URLSearchParams(params);        
  const requestInfo: RequestInfo = new Request(`${url}?${queryString}`, requestInit );

  const response = await fetch(requestInfo);      
  const result = await response.json();

  console.log("got result");
  console.log(result);

  return result;
}


async function createNewSet(name: string, description: string): Promise<NewSet> {

  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzQwZWI1NWNlNTRlMTU0NjUzYWNhMjEiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJzY2ljYXRhZG1pbkB5b3VyLnNpdGUiLCJhdXRoU3RyYXRlZ3kiOiJsb2NhbCIsIl9fdiI6MCwiaWQiOiI2NzQwZWI1NWNlNTRlMTU0NjUzYWNhMjEiLCJpYXQiOjE3MzI3NTU3MzksImV4cCI6MTczMjc1OTMzOX0.hlxNo0iJdCddnx7q0M4CvXWq2zNpzX5sGWJDMDd3XRs';

  const body = {
    "description": name,
    "sampleCharacteristics": {
      "lbnl_config_meta_type": "set",
      "lbnl_config_meta_description": description
    },
    "isPublished": false,
    ownerGroup: "group1",
  };
 
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      'Authorization': "Bearer " + jwt,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };

  const url = 'http://backend.localhost/api/v3/samples';

  const requestInfo: RequestInfo = new Request(url, requestInit );
  const response = await fetch(requestInfo);
  const result = await response.json();
  console.log("got result");
  console.log(result);

  const newSet: NewSet = {
    id: result.id as Guid,
    name: name,
    description: description
  };

  return newSet;
}

export {readConfigsForProposalId, createNewSet}
