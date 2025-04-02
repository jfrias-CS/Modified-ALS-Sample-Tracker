import { appConfiguration } from './appConfiguration.ts';
import { getJwt, getUserId } from './jwtUtils.ts';


interface ResponseWrapper<Data> {
  success: boolean;
  response?: Data;
  message?: string;
}


// Somewhere up here we need an authentication check that looks for a cookie containing the bearer token given to us post-authentication.
// If the cookie is missing, it needs to look for a token (jwt) in the encoded fields of the URL.
// If the token exists it should be extracted and saved as a cookie, and the load should proceed.
// If there is no cookie and no JWT, we should redirect to a login URL, with a post-load ridirect given as the
// original requested URL, e.g:


// Assemble a redirect to the login page specified in appConfiguration,
// with a return location of the current page, and send the browser to it.
function redirectToLogin() {
  const loginUrl = new URL(appConfiguration.config.externalAuthUrl);
  // Note that returnUrl is respected by the SciCat front end, but is currently
  // overridden by the SciCat back end.  This is a bug that SciCat needs to fix.
  loginUrl.searchParams.append("returnUrl", window.location.toString());
  const url = loginUrl.toString();
  appConfiguration.logger(`Redirecting to '${url}'`);
  window.location.href = url;
}


// Return the Id of the currently authenticated user,
// or immediately redirect to the login page.
function getUserIdOrRedirect(): string | null {
  const userIdMaybe = getUserId();
  if (userIdMaybe == null) {
    redirectToLogin();
    return null;
  } else {
    return userIdMaybe;
  }
}


// A general-purpose function that constructs and makes an asynchronous SciCat API call.
async function sciCatApiCall(url: string, method: string, params: Record<string, string> | null, body: string | null): Promise<ResponseWrapper<Response>> {

  appConfiguration.logger(`SciCat ${method} to '${url}'`);
  const jwt = getJwt();
  if (jwt === null) {
    const result = { success: false, message: "Error: Authentication token not found. Are you sure you're logged in?" };
    appConfiguration.logger(result);
    return result;
  }

  var headers:HeadersInit = { 'Authorization': "Bearer " + jwt };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  var queryString = "";
  if (params) {
    const searchParams = new URLSearchParams(params);
    queryString = `?${searchParams}`;
    appConfiguration.logger(`Params: ${searchParams}`);
  }

  var requestInit: RequestInit = {
        method: method,
        headers: headers,
      };
  if (body) {
    requestInit['body'] = body;
    appConfiguration.logger(`Body: ${body}`);
  }

  try {
    const requestInfo: RequestInfo = new Request(`${appConfiguration.config.scicatAppUrl}${appConfiguration.config.scicatApiPath}${url}${queryString}`, requestInit );
    const response = await fetch(requestInfo);
    var result;

    if (response.status == 201 || response.status == 200) {
      result = { success: true, response: response };
    } else {
      if (response.status == 401) {
        result = { success: false, response: response, message: "Error: Unauthorized. Are you sure you're still logged in?" };
      } else {
        result = { success: false, response: response, message: "Error" };
      }
    }

  } catch (err) {
    result = { success: false, message: "Exception" };
  }

  appConfiguration.logger(result);
  return result;
}


// A general-purpose function for making an asynchronous SciCat API call using the GET method.
async function sciCatGet(url: string, params: Record<string, string>): Promise<ResponseWrapper<Response>> {
  return sciCatApiCall(url, "GET", params, null);
}

// A general-purpose function for making an asynchronous SciCat API call using the DELETE method.
async function sciCatDelete(url: string, params: Record<string, string>): Promise<ResponseWrapper<Response>> {
  return sciCatApiCall(url, "DELETE", params, null);
}

// A general-purpose function for making an asynchronous SciCat API call using the PATCH method.
async function sciCatPatch(url: string, body: string): Promise<ResponseWrapper<Response>> {
  return sciCatApiCall(url, "PATCH", null, body);
}

// A general-purpose function for making an asynchronous SciCat API call using the POST method.
async function sciCatPost(url: string, body: string): Promise<ResponseWrapper<Response>> {
  return sciCatApiCall(url, "POST", null, body);
}


export type { ResponseWrapper }
export { redirectToLogin, getUserIdOrRedirect, sciCatGet, sciCatPost, sciCatDelete, sciCatPatch }
