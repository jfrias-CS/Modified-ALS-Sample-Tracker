// Utility functions for dealing with JWT/authentication cookies set by the SciCat back end.
// Note: If anyone can explain to me why SciCat sets cookies with the name "LoopBackSDK" in them,
// I'd be interested to know.


// Decode and parse JSON data in Base64Url format.
function decodeBase64Url(base64Url: string) {
  // The "base64url" standard used for JWT differs from "base64" by two important characters: 
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  // If padding is missing (not likely), re-add it.
  if ((base64.length % 4) == 1) { throw 'Invalid base64url string'; }
  if ((base64.length % 4) == 2) { base64 += '=='; }
  else if ((base64.length % 4) == 3) { base64 += '='; }
  // "window.atob" has been widely available since 2007
  const binString = window.atob(base64);
  // Uint8Array has been widely available since 2011
  const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
  // TextDecoder has been widely available since 2017
  const text = new TextDecoder().decode(bytes);
  // JSON.parse has been widely available since 2009
  const json = JSON.parse(text);
  return json;
}


// Decode the JWT and return its contents.
function decodeJwt(token: string) {
  // We're not verifying the signature here.
  // There's not much point to doing so on the front-end.
  const [ headEncoded, payloadEncoded, signature ] = token.split(".");
  const head = decodeBase64Url(headEncoded);
  const payload = decodeBase64Url(payloadEncoded);
  return { head: head, payload: payload, signature: signature };
}


// This looks for and returns the JWT token set in a browser cookie by the loopback library.
// Note that it looks for and removes a "Bearer%20" prefix.
function getJwt(): string | null {
  const bearerMaybe = document.cookie.split(";").find((row) => row.trim().startsWith("id="));
  if (bearerMaybe === undefined) { return null; }
  const bearer = bearerMaybe.trim().slice(3);
  //if (!bearer.startsWith("Bearer%20")) { return null; }
  //const jwt = bearer.slice(9);
  return bearer;
}


// This looks for and returns the userId value set in a browser cookie by the looopback library.
function getUserId(): string | null {
  const userIdOrNull = document.cookie.split(";").find((row) => row.trim().startsWith("userId="));
  if (userIdOrNull === undefined) { return null; }
  const userId = userIdOrNull.trim().slice(7);
  return userId;
}


export { getJwt, decodeJwt, getUserId }
