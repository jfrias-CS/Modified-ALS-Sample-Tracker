import { createContext, useState, useEffect } from "react";
import { ScanTypes, ScanType, getScanTypes } from './scanTypes.ts'
import { SampleConfiguration, SampleConfigurationSet } from './sampleConfiguration.ts'

// This is a "context provider" React component for a SampleConfigurationSet instance.

// It keeps its own internal instance of SampleConfigurationSet and
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

interface SampleConfigurationInterface {
  instance: SampleConfigurationSet;
  sampleConfigurations: SampleConfiguration[];
  scanTypes: ScanTypes;
  refresh: () => void
}

const SampleConfigurationContext = createContext<SampleConfigurationInterface>({
                    instance: new SampleConfigurationSet({types:[],parameters:[]}), // Should never be reached
                    sampleConfigurations: [],
                    scanTypes: {types:[],parameters:[]},
                    refresh: () => {}
                  });

const SampleConfigurationProvider = (props) => {
  const [sampleConfigurationsObject, setSampleConfigurationsObject] = useState<SampleConfigurationSet>(new SampleConfigurationSet({types:[],parameters:[]}));
  const [sampleConfigurations, setSampleConfigurations] = useState<SampleConfiguration[]>([]);
  const [scanTypes, setScanTypes] = useState<ScanTypes>({types:[],parameters:[]});

  useEffect(() => {
    console.log('SampleConfigurationContext component mounted');
    // My eventually by an asynchronous call.
    setScanTypes(getScanTypes());

    return () => {
        console.log('SampleConfigurationContext component unmounted');
    };
  }, []);

  function refreshSampleConfigurations() {
    console.log("Calling refreshSampleConfigurations");
    setSampleConfigurations(sampleConfigurationsObject.all());
  };

  useEffect(() => {
    console.log('Updating scanTypes in sampleConfigurationsObject');
    sampleConfigurationsObject.setScanTypes(scanTypes);
    refreshSampleConfigurations();
  }, [scanTypes]);

  return (
    <SampleConfigurationContext.Provider value={{
        instance: sampleConfigurationsObject,
        sampleConfigurations: sampleConfigurations,
        scanTypes: scanTypes,
        refresh: refreshSampleConfigurations
    }}>
    {props.children}
    </SampleConfigurationContext.Provider>
  )
}

export {SampleConfigurationContext, SampleConfigurationProvider}