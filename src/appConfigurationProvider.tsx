import { createContext, useState, useEffect, PropsWithChildren } from "react";

import { LoadingBanner, LoadingState } from './components/loadingBanner.tsx';

// This is a "context provider" React component for the configuration of our application.

// It fetches JSON file of settings from the site where this application is hosted,
// e.g. https://<site>/assets/config.json , then parses that into an object and
// provides access to that object for any React component that lives below it.

// The JSON file is cached by the browser's usual content fetching system, so this
// process is pretty lightweight.

// Discussion:
// Why do this, instead of baking in a file of settings during compile time?
// Because that would require compiling and building the image for each different configuration.
// This way we build one standard image, then use Docker Compose or Kubernetes to overlay
// just the config.json file during deployment.
// What about using an environment file that's read when the server in the image is launched?
// There are a handful of ways to get those environment variables injected into the data
// served by nginx - as HTTP headers, as a search/replace initialization step, etc - but they are
// all cumbersome and would still require customization at deployent time similar to what we already do.


// The structure we are providing to components in the hierarchy below the provider
interface AppConfig {
  scicatAppUrl: string;
  scicatApiPath: string;
  externalAuthUrl: string;
  externalAuthSucessUrl: string;
  loginEnabled: boolean;
  debugLogginginEnabled: boolean;
  defaultProjectId: string | undefined;
}

// These should never be accessed.  They're here as placeholders before the config actually loads.
const appConfigDefaults:AppConfig = {
  scicatAppUrl: "",
  scicatApiPath: "",
  externalAuthUrl: "",
  externalAuthSucessUrl: "",
  loginEnabled: false,
  debugLogginginEnabled: false,
  defaultProjectId: ""
}

enum ProviderLoadingState { NotTriggered, Pending, Succeeded, Failed };

// The structure we are providing to components in the hierarchy below the provider
interface AppConfigurationInterface {
  config: AppConfig;
  log: (...args: any[]) => void;
  loadingState: ProviderLoadingState;
}

const AppConfigurationContext = createContext<AppConfigurationInterface>({
                    config: appConfigDefaults, // Should never be reached
                    log: () => {},
                    loadingState: ProviderLoadingState.NotTriggered,
                  });

const AppConfigurationProvider: React.FC<PropsWithChildren> = (props) => {

  const [appConfigurationsObject, setAppConfigurationsObject] = useState<AppConfig>(appConfigDefaults);
  const [loadingState, setLoadingState] = useState<ProviderLoadingState>(ProviderLoadingState.NotTriggered);
  const [loadingBannerState, setLoadingBannerState] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    // We're only going to try this once:
    if (loadingState != ProviderLoadingState.Pending) { return; }

    const fetchData = async () => {
      try {
        const requestInit: RequestInit = {
          method: "GET"
        };
        const requestInfo: RequestInfo = new Request('/config.json', requestInit );
        const response = await fetch(requestInfo);
    
        if (response.status == 201 || response.status == 200) {
          const rawRecords:AppConfig = await response!.json();
          setAppConfigurationsObject(rawRecords);
          setLoadingState(ProviderLoadingState.Succeeded);
          return;

        }
        console.error('Error fetching config. Result:', response.status);        
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setLoadingState(ProviderLoadingState.Failed);
      setLoadingBannerState(LoadingState.Failure);
      setLoadingMessage('Error fetching configuration. Are you connected to the network?');
    };

    fetchData();

  }, [loadingState]);


  useEffect(() => {
    setLoadingState(ProviderLoadingState.Pending);
  }, []);


  function logger(...args: any[]) {
    if (appConfigurationsObject.debugLogginginEnabled) {
      console.log(...args);
    }
  }

  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  if (loadingState != ProviderLoadingState.Succeeded) {
    return (<LoadingBanner state={loadingBannerState} message={loadingMessage}></LoadingBanner>)
  }

  return (
    <AppConfigurationContext.Provider value={{
        config: appConfigurationsObject,
        log: logger,
        loadingState: loadingState,
    }}>
    {props.children}
    </AppConfigurationContext.Provider>
  )
}

export type { AppConfig }
export { AppConfigurationContext, AppConfigurationProvider, ProviderLoadingState }