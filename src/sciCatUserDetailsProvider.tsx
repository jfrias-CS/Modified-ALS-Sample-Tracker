import { createContext, useContext, useState, useEffect, PropsWithChildren } from "react";

import { AppConfigurationContext } from './appConfigurationProvider.tsx';
import { SciCatLoginContext } from './sciCatLoginProvider.tsx';

import { SciCatUserIdentity, getUserDetails } from './sciCatApi.ts';


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
  const [userDetailsObject, setUserDetailsObject] = useState<SciCatUserIdentity | null>(null);
  const [loadingState, setLoadingState] = useState<UserDetailsLoadingState>(UserDetailsLoadingState.NotTriggered);


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
        if (userId == null) { throw new Error("userId given to SciCatUserDetailsProvider is null"); }

        const u = userId.trim()
        if (!u) {
          setLoadingState(UserDetailsLoadingState.Failed);
          throw new Error("userId given to SciCatUserDetailsProvider is blank");
        }

        const result = await getUserDetails(u);
        if (result.success) {
          const details = result.response!;
          appConfig.log('User details:', details);
          setUserDetailsObject(details);
          setLoadingState(UserDetailsLoadingState.Succeeded);
          return;
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
      setLoadingState(UserDetailsLoadingState.Failed);
    };

    // Call fetchData when the userId changes
    if (loadingState == UserDetailsLoadingState.Pending) {
      fetchData();
      appConfig.log('Called fetchData');
    }
  }, [loadingState, userId]);


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