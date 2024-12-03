import { createContext, useState, useEffect, PropsWithChildren } from "react";

import { Guid } from "./components/utils.tsx";
import { ScanTypes, getScanTypes } from './scanTypes.ts';
import { SampleConfigurationSets } from './sampleConfiguration.ts';
import { RecordsFromServer, whoAmI, readConfigsForProposalId } from './sampleConfigurationApi.ts';


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
// If we're dealing with config sets larger than, say, 1000, with dozens of parameters,
// we might need to redesign.


// This component should be provided with a proposalId to use as a reference when fetching configuration sets.
// If the component is given a null proposalId it will skip loading,
// then try again as soon as the value is changed.
interface ProviderProps {
  proposalId: string | undefined;
}

enum ProviderLoadingState { NotTriggered, Pending, Succeeded, Failed };

// The structure we are providing to components in the hierarchy below the provider
interface SampleConfigurationInterface {
  // Access to the current instance of SampleConfigurationSets
  sets: SampleConfigurationSets;
  // Track the status of loading all the sets.
  setsLoadingState: ProviderLoadingState;
  // Essential metadata for interpreting SampleConfiguration objects.
  scanTypes: ScanTypes;
  // Set to true when successfully loaded, which should happen automatically after this comoponent is mounted.
  scanTypesLoadingState: ProviderLoadingState;
  // A callback for when a child component makes a change to the SampleConfigurationSets instance.
  changed: () => void;
  // This counter is incremented whenever the SampleConfigurationSets data is changed.
  // Components can watch this counter to know when they need to re-render,
  // or compare existing cached data to check for a re-render.
  // Actually more straightforward than providing a registration point for callbacks.
  changeCounter: number;
}

const SampleConfigurationContext = createContext<SampleConfigurationInterface>({
                    sets: new SampleConfigurationSets("empty", "0" as Guid), // Should never be reached
                    scanTypes: {typesByName:new Map(),typeNamesInDisplayOrder:[],parametersById:new Map()},
                    setsLoadingState: ProviderLoadingState.NotTriggered,
                    scanTypesLoadingState: ProviderLoadingState.NotTriggered,
                    changed: () => {},
                    changeCounter: 0
                  });

const SampleConfigurationProvider: React.FC<PropsWithChildren<ProviderProps>> = (props) => {
  const [proposalId, setProposalId] = useState<string | undefined>(props.proposalId);

  const [sampleConfigurationsObject, setSampleConfigurationsObject] = useState<SampleConfigurationSets>(new SampleConfigurationSets("empty", "0" as Guid));
  const [scanTypes, setScanTypes] = useState<ScanTypes>({typesByName:new Map(),typeNamesInDisplayOrder:[],parametersById:new Map()});

  const [setsLoadingState, setSetsLoadingState] = useState<ProviderLoadingState>(ProviderLoadingState.NotTriggered);
  const [scanTypesLoadingState, setScanTypesLoadingState] = useState<ProviderLoadingState>(ProviderLoadingState.NotTriggered);

  const [changeCounter, setChangeCounter] = useState<number>(0);


  useEffect(() => {
    console.log('SampleConfigurationProvider mounted');

    // Will eventually be an asynchronous call.
    setScanTypes(getScanTypes());
    setScanTypesLoadingState(ProviderLoadingState.Succeeded);
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
    
    setSetsLoadingState(ProviderLoadingState.NotTriggered);

    const fetchData = async () => {
      try {
        if (proposalId === undefined) { throw new Error("ProposalId not defined"); }

        const p = proposalId.trim()
        if (!p) {
          setSetsLoadingState(ProviderLoadingState.Failed);
          throw new Error("ProposalId is blank");
        }

        setSetsLoadingState(ProviderLoadingState.Pending);

        const result = await readConfigsForProposalId(p);
        if (result.success) {
          ingestFromServer(result.response!);
          return;
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setSetsLoadingState(ProviderLoadingState.Failed);
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


  // Take the given Set and Config objects, combine them
  // together under a SampleConfigurationSets object, and set that as the current
  // working data.
  function ingestFromServer(records: RecordsFromServer) {
    console.log("Calling ingestFromServer");
    console.log(records);

    // Create a master container for all our sets
    const setContainer = new SampleConfigurationSets(proposalId!, proposalId as Guid);
    setContainer.setScanTypes(scanTypes);
    setContainer.add(records.sets);

    records.configs.forEach((c) => {
      const thisSet = setContainer.getById(c.setId);
      if (!thisSet) { return; }
      thisSet.add([c]);
    });

    setSampleConfigurationsObject(setContainer);
    setSetsLoadingState(ProviderLoadingState.Succeeded);
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
        setsLoadingState: setsLoadingState,
        scanTypesLoadingState: scanTypesLoadingState,
        changed: changed,
        changeCounter: changeCounter
    }}>
    {props.children}
    </SampleConfigurationContext.Provider>
  )
}

export {SampleConfigurationContext, SampleConfigurationProvider, ProviderLoadingState}