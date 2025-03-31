import { Guid } from "./components/utils.tsx";
import { ResponseWrapper, sciCatGet, sciCatPost, sciCatDelete, sciCatPatch } from "./sciCatBasicApi.ts";


// Common type for ownable objects.
interface Ownable {
  ownerGroup: string; // Name of the group owning this item.
  accessGroups?: string[];  // List of groups which have access to this item.
  instrumentGroup?: string; // Group of the instrument which this item was acquired on.
  isPublished?: boolean;
}

// Fields provided by Mongoose.
// Set as optional because they are not valid in create/update operations.
interface Timestamps {
  createdAt?: string;
  updatedAt?: string;
}


interface SciCatSample extends Ownable, Timestamps {
  id?: string; // uuidv4
  owner?: string;
  description?: string;
  sampleCharacteristics?: any;
}


interface SciCatUserProfile {
  displayName: string;
  username: string;
  email: string;
  emails: string[];
  id: string;
  accessGroups: string[];
  oidcClaims?: string[];
  thumbnailPhoto?: "";
}

// Identity details of a SciCat user, as defined by SciCat, and as returned by the UserIdentities API.
interface SciCatUserIdentity {
  authStrategy: string;
//    credentials: {},
  externalId: string;
  profile: SciCatUserProfile;
  provider: string;
  userId: string;
  created: string;
  modified: string;
}


// Test function.  SciCat sometimes returns '{}' from this, which is honestly not very useful.
async function whoAmI(): Promise<ResponseWrapper<string>> {
  const result = await sciCatGet('auth/whoami',{});
  if (!result.success) {
    return { success: false, message: result.message };
  }
  const rawRecords:any = await result.response!.text();
  return { success: true, response: rawRecords };
}


// Get details of the given user, including group membership
async function getUserDetails(userId: string): Promise<ResponseWrapper<SciCatUserIdentity>> {
  if (userId === null) {
    return { success: false, message: "SciCat userId is null. Are you sure you're logged in?" };
  }

  const params = { filter: `{"where":{"userId": "${userId}" }}` };
  const result = await sciCatGet('UserIdentities/findOne', params);
  if (!result.success) {
    return { success: false, message: result.message };
  }
  const record:any = await result.response!.json();
  return { success: true, response: record };
}


// Create a new sample.  Returns the created record with its id.
async function createSample(sample: SciCatSample): Promise<ResponseWrapper<SciCatSample>> {
  const result = await sciCatPost('samples', JSON.stringify(sample));
  if (result.success) {
    const newRecord:SciCatSample = await result.response!.json();
    return { success: true, response: newRecord };
  }
  return { success: false, message: result.message };
}


// Get all samples with the given groupId in their ownerGroup
async function getSamplesForGroupId(groupId: string): Promise<ResponseWrapper<SciCatSample[]>> {

  const params = { filter: `{"where":{"ownerGroup": "${groupId}" }}` };
  const result = await sciCatGet('samples', params);

  // More sophisticated query structure - not needed
//  const params = {
//    fields: `{"characteristics": [{"lhs":"ownerGroup","relation":"EQUAL_TO_STRING","rhs":"${groupId}"}]}`
//  };
//  const result = await sciCatGet('samples', params);

  if (!result.success) {
    return { success: false, message: result.message };
  }
  const records:any = await result.response!.json();
  return { success: true, response: records }
}


// Delete a Sample record from the server, returning the Id used if successful.
async function deleteSample(sampleId: Guid): Promise<ResponseWrapper<Guid>> {
  const result = await sciCatDelete(`samples/${sampleId}`, {});
 if (result.success) {
   return { success: true, response: sampleId };
 }
 return { success: false, message: result.message };
}


export type { SciCatSample, SciCatUserProfile, SciCatUserIdentity }
export { whoAmI, getUserDetails, createSample, getSamplesForGroupId, deleteSample }
