import { createContext, useState, useEffect, PropsWithChildren } from "react";
import { Guid } from "./components/utils.tsx";
import { ScanTypes, ScanType, getScanTypes } from './scanTypes.ts'
import { SampleConfiguration, SampleConfigurationSet, SampleConfigurationSets } from './sampleConfiguration.ts'

// This is a "context provider" React component for a SampleConfigurationSets instance.

// It keeps its own internal instance of SampleConfigurationSets and
// exposes the necessary functions to manipulate it, plus the current full
// contents of the set.
// It's designed to be placed once in the DOM.

// This design allows relatively free access to the current state of the
// entire configuration anywhere, but of course creates the usual performance problem
// of the set being monolithic.  That is, even if we just change one parameter
// in one SampleConfiguration and it's not the value being sorted on, which would
// require us to only update a single table cell in the DOM, this design
// invalidates the content of the entire table, forcing both a re-sort and a re-draw.
// If we're dealing with sample sets larger than, say, 1000, with dozens of parameters,
// we might need to redesign.


// These three interfaces define the records we expect to get from the server when fetching real data
interface ConfigFromServer {
  name: string,
  id: string,
  mmFromLeftEdge: string,
  description: string,
  scanType: string,
  parameters: { [key: string]: string|null }
}

interface SetFromServer {
  name: string,
  description: string,
  id: string,
  configs: ConfigFromServer[]
}

interface SetsFromServer {
  name: string,
  proposalId: string,
  sets: SetFromServer[]
}

interface SampleConfigurationInterface {
  instance: SampleConfigurationSets;
  scanTypes: ScanTypes;
  setsLoaded: boolean;
  scanTypesLoaded: boolean;
  refresh: () => void;
  ingestFromServer: (s: SetsFromServer) => void;
}

const SampleConfigurationContext = createContext<SampleConfigurationInterface>({
                    instance: new SampleConfigurationSets("empty", "0" as Guid, true), // Should never be reached
                    scanTypes: {types:[],parameters:[]},
                    setsLoaded: false,
                    scanTypesLoaded: false,
                    refresh: () => {},
                    ingestFromServer: () => {}
                  });

const SampleConfigurationProvider: React.FC<PropsWithChildren> = (props) => {
  const [sampleConfigurationsObject, setSampleConfigurationsObject] = useState<SampleConfigurationSets>(new SampleConfigurationSets("empty", "0" as Guid, true));
  const [scanTypes, setScanTypes] = useState<ScanTypes>({types:[],parameters:[]});
  const [setsLoaded, setSetsLoaded] = useState<boolean>(false);
  const [scanTypesLoaded, setScanTypesLoaded] = useState<boolean>(false);

  useEffect(() => {
    console.log('SampleConfigurationProvider mounted');
    // My eventually by an asynchronous call.
    setScanTypes(getScanTypes());
    setScanTypesLoaded(true);
    return () => {
        console.log('SampleConfigurationProvider unmounted');
    };
  }, []);

  function refreshSampleConfigurations() {
    console.log("Calling refreshSampleConfigurations");
  };

  function ingestFromServer(s: SetsFromServer) {
    console.log("Calling ingestFromServer");
    const sets = new SampleConfigurationSets(s.name, s.proposalId as Guid, false);
    sets.setScanTypes(scanTypes);
    setSampleConfigurationsObject(sets);
    setSetsLoaded(true);
  };

  useEffect(() => {
    console.log('Updating scanTypes in sampleConfigurationsObject');
    sampleConfigurationsObject.setScanTypes(scanTypes);
    refreshSampleConfigurations();
  }, [scanTypes]);

  return (
    <SampleConfigurationContext.Provider value={{
        instance: sampleConfigurationsObject,
        scanTypes: scanTypes,
        setsLoaded: setsLoaded,
        scanTypesLoaded: scanTypesLoaded,
        refresh: refreshSampleConfigurations,
        ingestFromServer: ingestFromServer
    }}>
    {props.children}
    </SampleConfigurationContext.Provider>
  )
}

export {SampleConfigurationContext, SampleConfigurationProvider}