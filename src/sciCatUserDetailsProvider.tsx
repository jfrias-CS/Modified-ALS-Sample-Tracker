import { createContext, useContext, useState, useEffect, PropsWithChildren } from "react";

import { SciCatUserIdentity, getUserDetails } from './sciCatApi.ts';
import { redirectToLogin } from './sciCatBasicApi.ts';
import { AppConfigurationContext } from './appConfigurationProvider.tsx';
import { SciCatLoginContext } from './sciCatLoginProvider.tsx';
import { LoadingBanner, LoadingState } from './components/loadingBanner.tsx';


// This is a "context provider" React component for the user details object provided by SciCat
// for the userId provided by SciCatLoginProvider.

enum UserDetailsLoadingState { NotTriggered, Pending, Succeeded, Failed };

// The structure we are providing to components in the hierarchy below the provider
interface SampleConfigurationInterface {
  userDetails: SciCatUserIdentity | null;
  loadingState: UserDetailsLoadingState;
}

const SciCatUserDetailsContext = createContext<SampleConfigurationInterface>({
    userDetails: null,
    loadingState: UserDetailsLoadingState.NotTriggered,
  });

const SciCatUserDetailsProvider: React.FC<PropsWithChildren> = (props) => {
  const appConfig = useContext(AppConfigurationContext);
  const loginContext = useContext(SciCatLoginContext);

  const [userId, setUserId] = useState<string | null>(loginContext.userId);
  const [loadingState, setLoadingState] = useState<UserDetailsLoadingState>(UserDetailsLoadingState.NotTriggered);
  const [userDetailsObject, setUserDetailsObject] = useState<SciCatUserIdentity | null>(null);
  const [loadingBannerState, setLoadingBannerState] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("Fetching user info...");


  useEffect(() => {
    appConfig.log('SciCatUserDetailsProvider mounted');
    setLoadingState(UserDetailsLoadingState.Pending);
    return () => {
      appConfig.log('SciCatUserDetailsProvider unmounted');
    };
  }, []);


  useEffect(() => {

    const fetchData = async () => {
      try {
        if (userId == null) {
          appConfig.log("userId given to SciCatUserDetailsProvider is null");
        } else {
          const u = userId.trim()
          if (!u) {
            setLoadingState(UserDetailsLoadingState.Failed);
            appConfig.log("userId given to SciCatUserDetailsProvider is blank");
          } else {

            const result = await getUserDetails(u);
            if (result.success) {
              const details = result.response!;
              appConfig.log('User details:', details);
              setUserDetailsObject(details);
              setLoadingState(UserDetailsLoadingState.Succeeded);
              return;
            }
          }
        }
      } catch (error) {
        appConfig.log('Error fetching user details:', error);
      }
      // Anything other than a successful fetch causes a redirect to the login page.
      setLoadingState(UserDetailsLoadingState.Failed);
      setLoadingBannerState(LoadingState.Failure);
      setLoadingMessage("Can't get logged in user details. Redirecting you to SciCat login page...");
      redirectToLogin();
    };

    // Call fetchData when the userId changes
    if (loadingState == UserDetailsLoadingState.Pending) {
      fetchData();
    }
  }, [loadingState, userId]);


  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  if (loadingState != UserDetailsLoadingState.Succeeded) {
    return (<LoadingBanner state={loadingBannerState} message={loadingMessage}></LoadingBanner>)
  }


  return (
    <SciCatUserDetailsContext.Provider value={{
        userDetails: userDetailsObject,
        loadingState: loadingState
    }}>
    {props.children}
    </SciCatUserDetailsContext.Provider>
  )
}

export { SciCatUserDetailsContext, SciCatUserDetailsProvider, UserDetailsLoadingState }