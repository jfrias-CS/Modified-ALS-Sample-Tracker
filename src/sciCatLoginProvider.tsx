import { createContext, useState, useEffect, useContext, PropsWithChildren } from "react";

import { getUserIdOrRedirect } from './sciCatBasicApi.ts';
import { LoadingBanner, LoadingState } from './components/loadingBanner.tsx';

// This is a "context provider" React component for ensuring that we have an authenticated SciCat user.

// It uses the AppConfigurationContext to determine where to redirect when login is needed,
// and if a user is present, makes the userId available to all sub-components in the React tree.


enum LoginCheckState { NotChecked, Pending, Succeeded, Failed };

// The structure we are providing to components in the hierarchy below the provider
interface SciCatLoginInterface {
  userId: string | null;
}

const SciCatLoginContext = createContext<SciCatLoginInterface>({
                    userId: null
                  });

const SciCatLoginProvider: React.FC<PropsWithChildren> = (props) => {

  const [loginState, setLoginState] = useState<LoginCheckState>(LoginCheckState.NotChecked);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingBannerState, setLoadingBannerState] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("Checking login status...");


  useEffect(() => {

    if (loginState == LoginCheckState.Failed) {
      setLoadingBannerState(LoadingState.Failure);
      setLoadingMessage('No user is logged in. Redirecting you to SciCat login page...');
      return;
    }

    if (loginState == LoginCheckState.Succeeded) {
      setLoadingBannerState(LoadingState.Success);
      return;
    }

    if (loginState == LoginCheckState.Pending) {
      // This relies on a properly loaded AppConfiguration,
      // which is why this context provider needs to be inside an AppConfigurationProvider,
      const id = getUserIdOrRedirect();
      setUserId(id);
      if (id === null) {
        setLoginState(LoginCheckState.Failed);
      } else {
        setLoginState(LoginCheckState.Succeeded);
      }
    }
  }, [loginState]);


  useEffect(() => {
    setLoginState(LoginCheckState.Pending);
  }, []);

  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  if (loginState != LoginCheckState.Succeeded) {
    return (<LoadingBanner state={loadingBannerState} message={loadingMessage}></LoadingBanner>)
  }

  return (
    <SciCatLoginContext.Provider value={{
      userId: userId
    }}>
    {props.children}
    </SciCatLoginContext.Provider>
  )
}

export { SciCatLoginContext, SciCatLoginProvider, LoginCheckState }