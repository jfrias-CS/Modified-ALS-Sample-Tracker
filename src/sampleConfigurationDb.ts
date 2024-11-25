import { ScanTypes, getScanTypes } from './scanTypes.ts';
import { SampleConfigurationSets } from './sampleConfiguration.ts';


// This is a "context provider" React component for a SampleConfigurationSets instance.

// It keeps its own internal instance of SampleConfigurationSets and
// provides hooks for a few additional functions to manipulate it.
// It's designed to be placed once in the DOM.

// This design allows relatively free access to the current state of the
// entire configuration anywhere, but of course creates the usual performance problem
// of the set being monolithic.  That is, even if we just change one parameter
// in one SampleConfiguration and it's not the value being sorted on, which would
// require us to only update a single table cell in the DOM, this design
// invalidates the content of the entire table, forcing both a re-sort and a re-draw.
// If we're dealing with sample sets larger than, say, 1000, with dozens of parameters,
// we might need to redesign.


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

async function readConfigsForProposalId(proposalId: string) {

  const requestInit: RequestInit = {
    method: "GET",
    headers: [["Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzAzNjIxODA3NzM0YjYxYmJkNzRiOWIiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJzY2ljYXRhZG1pbkB5b3VyLnNpdGUiLCJhdXRoU3RyYXRlZ3kiOiJsb2NhbCIsIl9fdiI6MCwiaWQiOiI2NzAzNjIxODA3NzM0YjYxYmJkNzRiOWIiLCJpYXQiOjE3MzIyMjc3NjMsImV4cCI6MTczMjIzMTM2M30.PDAN6zKgYiJ5iPgn1tBOJBAI5987uRXm3fTPZxIwfqA"]]
  };

  const url = 'http://backend.localhost/api/v3/samples';
  const params = {
  //          fields: '{"text":"1", "metadataKey": "proposalId", "characteristics": [{"lhs":"proposalId","relation":"EQUAL_TO_STRING","rhs":"1"}]}'
    filter: '{"where":{"ownerGroup": "aGroup" }}'
  };

  const queryString = new URLSearchParams(params);        
  const requestInfo: RequestInfo = new Request(`${url}?${queryString}`, requestInit );

  const response = await fetch(requestInfo);      
  const result = await response.json();

  console.log("got result");
  console.log(result);

  return result;
}

export {readConfigsForProposalId}