// This provides a single instance of an application configuration object.

// It populates the object by fetching a JSON file of settings from the site where this application
// is hosted, e.g. https://<site>/assets/config.json .

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
  debugLoggingingEnabled: boolean;
  defaultProjectId: string | undefined;
}

// These should never be accessed.  They're here as placeholders before the config actually loads.
const appConfigDefaults:AppConfig = {
  scicatAppUrl: "",
  scicatApiPath: "",
  externalAuthUrl: "",
  externalAuthSucessUrl: "",
  loginEnabled: false,
  debugLoggingingEnabled: false,
  defaultProjectId: ""
}

enum ConfigLoadingState { NotTriggered, Pending, Succeeded, Failed };


class AppConfiguration {

  config: AppConfig;
  loadingState: ConfigLoadingState;

  constructor () {
    this.loadingState = ConfigLoadingState.NotTriggered;
    this.config = appConfigDefaults;
  }

  logger(...args: any[]) {
    if (this.config.debugLoggingingEnabled) {
      const loggingDiv = document.createElement("div");
      loggingDiv.innerText = [ ...args].join(" ");
      const c = document.getElementsByTagName("body");
      c.item(0)?.appendChild(loggingDiv);
      console.log(...args);
    }
  }
  
  async load() {
    if (this.loadingState != ConfigLoadingState.NotTriggered) { return; }
    this.loadingState = ConfigLoadingState.Pending;

    try {
      const requestInit: RequestInit = {
        method: "GET"
      };

      const requestInfo: RequestInfo = new Request(`${import.meta.env.BASE_URL}/config.json`, requestInit );
      const response = await fetch(requestInfo);
  
      if (response.status == 201 || response.status == 200) {
        const rawRecords:AppConfig = await response!.json();
        this.config = rawRecords;
        this.loadingState = ConfigLoadingState.Succeeded;
        return;
      }
      console.error('Error fetching config. Result:', response.status);        
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    this.loadingState = ConfigLoadingState.Failed;
  }
}


const appConfiguration = new AppConfiguration();


export type { AppConfig }
export { appConfiguration, appConfigDefaults, ConfigLoadingState }