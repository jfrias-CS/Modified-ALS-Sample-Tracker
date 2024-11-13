import { createContext, useState, useEffect, PropsWithChildren } from "react";

import { Guid } from "./components/utils.tsx";
import { ScanTypes, getScanTypes } from './scanTypes.ts';
import { SampleConfigurationSets } from './sampleConfiguration.ts';


// This is a "context provider" React component for a SampleConfigurationSets instance.

// It keeps its own internal instance of SampleConfigurationSets and
// provides hooks for a few additional functions to manipulate it.
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


// This component should be provided with a proposalId to use as a reference when fetching configuration sets.
// If the component is given a null proposalId it will skip loading,
// then try again as soon as the value is changed.
interface ProviderProps {
  proposalId: string | undefined;
}

// The structure we are providing to components in the hierarchy below the provider
interface SampleConfigurationInterface {
  // Access to the current instance of SampleConfigurationSets
  sets: SampleConfigurationSets;
  // Set to true when the server responds with good data from a request.
  setsLoaded: boolean;
  // Essential metadata for interpreting SampleConfiguration objects.
  scanTypes: ScanTypes;
  // Set to true when successfully loaded, which should happen automatically after this comoponent is mounted.
  scanTypesLoaded: boolean;
  // A callback for when a child component makes a change to the SampleConfigurationSets instance.
  changed: () => void;
  // This counter is incremented whenever the SampleConfigurationSets data is changed.
  // Components can watch this counter to know when they need to re-render,
  // or compare existing cached data to check for a re-render.
  // Actually more straightforward than providing a registration point for callbacks.
  changeCounter: number;
}

const SampleConfigurationContext = createContext<SampleConfigurationInterface>({
                    sets: new SampleConfigurationSets("empty", "0" as Guid, true), // Should never be reached
                    scanTypes: {types:[],parameters:[]},
                    setsLoaded: false,
                    scanTypesLoaded: false,
                    changed: () => {},
                    changeCounter: 0
                  });

const SampleConfigurationProvider: React.FC<PropsWithChildren<ProviderProps>> = (props) => {
  const [sampleConfigurationsObject, setSampleConfigurationsObject] = useState<SampleConfigurationSets>(new SampleConfigurationSets("empty", "0" as Guid, true));
  const [scanTypes, setScanTypes] = useState<ScanTypes>({types:[],parameters:[]});
  const [setsLoaded, setSetsLoaded] = useState<boolean>(false);
  const [scanTypesLoaded, setScanTypesLoaded] = useState<boolean>(false);
  const [proposalId, setProposalId] = useState<string | undefined>(props.proposalId);
  const [changeCounter, setChangeCounter] = useState<number>(0);


  useEffect(() => {
    console.log('SampleConfigurationProvider mounted');

    // Will eventually be an asynchronous call.
    setScanTypes(getScanTypes());
    setScanTypesLoaded(true);
    return () => {
      console.log('SampleConfigurationProvider unmounted');
    };
  }, []);

  useEffect(() => {
    if (proposalId === undefined) {
      console.log('SampleConfigurationProvider given undefined proposalId');
      return;
    }
    console.log('SampleConfigurationProvider given proposalId ' + proposalId);
    
    setSetsLoaded(false);

    const fetchData = async () => {
      try {
        if (proposalId === undefined) { throw new Error("ProposalId not defined"); }

        const p = proposalId.trim()
        if (!p) { throw new Error("ProposalId is blank"); }

//        const requestInfo: RequestInfo = new Request("http://backend.localhost/api/v3/datasets", {
//              method: "GET"
          //    body: '{"proposalId": p.toString()}',
//            });

//        const response = await fetch(requestInfo);      
//        const result = await response.json();

        const s = {
          name: "Test Project",
          proposalId: proposalId,
          sets: []
        };

        ingestFromServer(s);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    // Call fetchData when the component mounts
    fetchData();
    console.log('Called fetchData');

  }, [proposalId]);

  // A callback for when a child component makes a change to the SampleConfigurationSets instance.
  // Note: In the future it may be prudent to pass a set ID into this,
  // to trigger separate server data update calls for each set, since each will have its own history.
  function changed() {
    console.log("Calling changed())");
    setChangeCounter(changeCounter + 1);
  };

  function ingestFromServer(s: SetsFromServer) {
    console.log("Calling ingestFromServer");
    const sets = new SampleConfigurationSets(s.name, proposalId as Guid, false);
    sets.setScanTypes(scanTypes);
    setSampleConfigurationsObject(sets);
    setSetsLoaded(true);
  };

  useEffect(() => {
    console.log('Updating scanTypes in sampleConfigurationsObject');
    sampleConfigurationsObject.setScanTypes(scanTypes);
    changed();
  }, [scanTypes]);

  return (
    <SampleConfigurationContext.Provider value={{
        sets: sampleConfigurationsObject,
        scanTypes: scanTypes,
        setsLoaded: setsLoaded,
        scanTypesLoaded: scanTypesLoaded,
        changed: changed,
        changeCounter: changeCounter
    }}>
    {props.children}
    </SampleConfigurationContext.Provider>
  )
}

export {SampleConfigurationContext, SampleConfigurationProvider}