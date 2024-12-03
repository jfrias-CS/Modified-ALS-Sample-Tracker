
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzAzNjIxODA3NzM0YjYxYmJkNzRiOWIiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJzY2ljYXRhZG1pbkB5b3VyLnNpdGUiLCJhdXRoU3RyYXRlZ3kiOiJsb2NhbCIsIl9fdiI6MCwiaWQiOiI2NzAzNjIxODA3NzM0YjYxYmJkNzRiOWIiLCJpYXQiOjE3MzMxODQ3MDcsImV4cCI6MTczMzE4ODMwN30._d_7mi3IxtYM9PCNhjkgVseuKmw-Xayiq2q-ohwyTLY';


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
//    const loginUrl = new URL(urls.ALS_AUTH_URL + "/login");
//    loginUrl.searchParams.append("return_to", window.location.toString());
//    window.location.href = loginUrl.toString();


async function sciCatGet(url: string, params: Record<string, string>): Promise<ResponseWrapper<Response>> {
  try {
    const requestInit: RequestInit = {
      method: "GET",
      headers: { 'Authorization': "Bearer " + jwt }
    };
    const queryString = new URLSearchParams(params);
    const requestInfo: RequestInfo = new Request(`http://backend.localhost/api/v3/${url}?${queryString}`, requestInit );
    const response = await fetch(requestInfo);

    if (response.status == 201 || response.status == 200) {
      return { success: true, response: response };
    } else {
      if (response.status == 401) {
        return { success: false, response: response, message: "Error: Unauthorized. Are you sure you're still logged in?" };
      }
      return { success: false, response: response, message: "Error" };
    }
  } catch (err) {
    return { success: false, message: "Exception" };
  }
}


async function sciCatPost(url: string, body: string): Promise<ResponseWrapper<Response>> {
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
      if (response.status == 401) {
        return { success: false, response: response, message: "Error: Unauthorized. Are you sure you're still logged in?" };
      }
      return { success: false, response: response, message: "Error" };
    }
  } catch (err) {
    return { success: false, message: "Exception" };
  }
}


export type { ResponseWrapper }
export { sciCatGet, sciCatPost }
