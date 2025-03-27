import { Guid } from "./components/utils.tsx";
import { ResponseWrapper, sciCatGet, sciCatPost, sciCatDelete, sciCatPatch } from "./sciCatBasicApi.ts";


interface SciCatUserProfile {
  accessGroups: string[];
  displayName: string;
  email: string;
  emails: string[];
  id: string;
//      oidcClaims: string[],
//      thumbnailPhoto: "",
  username: string;
}

// Identity details of a SciCat user, as defined by SciCat, and as returned by the UserIdentities API.
interface SciCatUserIdentity {
    authStrategy: string;
    created: string;
//    credentials: {},
    externalId: string;
    modified: string;
    profile: SciCatUserProfile;
    provider: string;
    userId: string;
}


// Test function.  SciCat returns '{}' from this, which is honestly not very useful.
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

  const params = {
    filter: `{"where":{"userId": "${userId}" }}`
  };
  const result = await sciCatGet('UserIdentities/findOne', params);
  if (!result.success) {
    return { success: false, message: result.message };
  }
  const rawRecords:any = await result.response!.text();
  return { success: true, response: rawRecords };
}


// Delete a Sample record from the server, returning the Id used if successful.
async function deleteSample(sampleId: Guid): Promise<ResponseWrapper<Guid>> {
   const result = await sciCatDelete(`samples/${sampleId}`, {});
  if (result.success) {
    return { success: true, response: sampleId };
  }
  return { success: false, message: result.message };
}


export type { SciCatUserIdentity }
export { whoAmI, getUserDetails, deleteSample }
