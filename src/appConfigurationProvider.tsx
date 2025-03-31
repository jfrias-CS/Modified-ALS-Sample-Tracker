import { createContext, useState, useEffect, PropsWithChildren } from "react";

import { AppConfig, appConfiguration, appConfigDefaults, ConfigLoadingState } from './appConfiguration.ts';
import { LoadingBanner, LoadingState } from './components/loadingBanner.tsx';

// This is a "context provider" React component for the configuration of our application.

// It uses the AppConfiguration class to fetch and cache a JSON settings file
// from the server, and makes it available to all sub-components in the React tree.
// (See appConfiguration.ts for details.)


// The structure we are providing to components in the hierarchy below the provider
interface AppConfigurationInterface {
  config: AppConfig;
  log: (...args: any[]) => void;
}

const AppConfigurationContext = createContext<AppConfigurationInterface>({
                    config: appConfigDefaults, // Should never be reached
                    log: () => {},
                  });

const AppConfigurationProvider: React.FC<PropsWithChildren> = (props) => {

  const [appConfigurationsObject, setAppConfigurationsObject] = useState<AppConfig>(appConfigDefaults);
  const [loadingState, setLoadingState] = useState<ConfigLoadingState>(ConfigLoadingState.NotTriggered);
  const [loadingBannerState, setLoadingBannerState] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {

    const loadConfig = async () => {
      await appConfiguration.load();
      setLoadingState(appConfiguration.loadingState);
    }

    if (loadingState == ConfigLoadingState.Failed) {
      setLoadingBannerState(LoadingState.Failure);
      setLoadingMessage('Error fetching configuration. Are you connected to the network?');
      return;
    }

    if (loadingState == ConfigLoadingState.Succeeded) {
      setAppConfigurationsObject(appConfiguration.config);
    }

    if (loadingState == ConfigLoadingState.Pending) {
      loadConfig();
    }
  }, [loadingState]);


  useEffect(() => {
    setLoadingState(ConfigLoadingState.Pending);
  }, []);


  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  if (loadingState != ConfigLoadingState.Succeeded) {
    return (<LoadingBanner state={loadingBannerState} message={loadingMessage}></LoadingBanner>)
  }

  return (
    <AppConfigurationContext.Provider value={{
        config: appConfigurationsObject,
        log: appConfiguration.logger
    }}>
    {props.children}
    </AppConfigurationContext.Provider>
  )
}

export type { AppConfig }
export { AppConfigurationContext, AppConfigurationProvider, ConfigLoadingState }