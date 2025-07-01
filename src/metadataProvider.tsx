import { createContext, useContext, useState, useEffect, PropsWithChildren } from "react";

import { Guid } from "./components/utils.tsx";
import { ScanTypes, getScanTypes } from './scanTypes.ts';
import { Groups, Group, getGroups } from "./groups.ts";
import { SampleConfigurationSets } from './sampleConfiguration.ts';
import { AppConfigurationContext } from './appConfigurationProvider.tsx';
import { readConfigsForProposalId } from './metadataApi.ts';


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
  groupId: string | undefined;
  proposalId: string | undefined;
}

enum MetaDataLoadingState { NotTriggered, Pending, Succeeded, Failed };

// The structure we are providing to components in the hierarchy below the provider
interface SampleConfigurationInterface {
  // Group ID
  groupId: string | undefined;
  // The proposalId that was provided to this provider
  proposalId: string | undefined;
  // Access to the current instance of SampleConfigurationSets
  sets: SampleConfigurationSets;
  // Essential metadata for interpreting SampleConfiguration objects.
  scanTypes: ScanTypes;

  // General loading state, succeeds when all others succeed.
  loadingState: MetaDataLoadingState;
  // Track the status of loading all the sets.
  setsLoadingState: MetaDataLoadingState;
  // Set to true when successfully loaded, which should happen automatically after this comoponent is mounted.
  scanTypesLoadingState: MetaDataLoadingState;

  // A callback for when a child component makes a change to the SampleConfigurationSets instance.
  changed: () => void;
  // This counter is incremented whenever the SampleConfigurationSets data is changed.
  // Components can watch this counter to know when they need to re-render,
  // or compare existing cached data to check for a re-render.
  // Actually more straightforward than providing a registration point for callbacks.
  changeCounter: number;
}

const MetadataContext = createContext<SampleConfigurationInterface>({
                    groupId: undefined,
                    proposalId: undefined,
                    sets: new SampleConfigurationSets("empty", "0" as Guid), // Should never be reached
                    scanTypes: {typesByName:new Map(),typeNamesInDisplayOrder:[],parametersById:new Map()},
                    loadingState: MetaDataLoadingState.NotTriggered,
                    setsLoadingState: MetaDataLoadingState.NotTriggered,
                    scanTypesLoadingState: MetaDataLoadingState.NotTriggered,
                    changed: () => {},
                    changeCounter: 0
                  });

const MetadataProvider: React.FC<PropsWithChildren<ProviderProps>> = (props) => {
  const [groupId, setGroupId] = useState<string | undefined>(props.groupId);
  const [proposalId, setProposalId] = useState<string | undefined>(props.proposalId);

  const appConfig = useContext(AppConfigurationContext);
  
  const [sampleConfigurationsObject, setSampleConfigurationsObject] = useState<SampleConfigurationSets>(new SampleConfigurationSets("empty", "0" as Guid));
  const [scanTypes, setScanTypes] = useState<ScanTypes>({typesByName:new Map(),typeNamesInDisplayOrder:[],parametersById:new Map()});

  const [loadingState, setLoadingState] = useState<MetaDataLoadingState>(MetaDataLoadingState.NotTriggered);
  const [setsLoadingState, setSetsLoadingState] = useState<MetaDataLoadingState>(MetaDataLoadingState.NotTriggered);
  const [scanTypesLoadingState, setScanTypesLoadingState] = useState<MetaDataLoadingState>(MetaDataLoadingState.NotTriggered);

  const [changeCounter, setChangeCounter] = useState<number>(0);


  useEffect(() => {
    appConfig.log('MetadataProvider mounted');

    // Will eventually be an asynchronous call.
    setScanTypes(getScanTypes(groupId)); // added the parameter groupId to filter scan types based on the group.
    setScanTypesLoadingState(MetaDataLoadingState.Succeeded);
    return () => {
      appConfig.log('MetadataProvider unmounted');
    };
  }, []);


  useEffect(() => {
    // Proceed only if our watched values equal these:
    if (setsLoadingState != MetaDataLoadingState.Pending) { return; }
    if (scanTypesLoadingState != MetaDataLoadingState.Succeeded) { return; }

    const fetchData = async () => {
      try {
        if (proposalId === undefined) { throw new Error("ProposalId not defined"); }

        const p = proposalId.trim()
        if (!p) {
          setSetsLoadingState(MetaDataLoadingState.Failed);
          throw new Error("ProposalId is blank");
        }

        const result = await readConfigsForProposalId(p);
        if (result.success) {
          const records = result.response!;
          appConfig.log('Ingesting records:', records);

          // Create a master container for all our sets
          const setContainer = new SampleConfigurationSets(proposalId!, proposalId as Guid);
          appConfig.log('Scan Types:', scanTypes);
          setContainer.setScanTypes(scanTypes);
          setContainer.add(records.sets);

          records.configs.forEach((c) => {
            const thisSet = setContainer.getById(c.setId);
            if (!thisSet) { return; }
            thisSet.add([c]);
          });

          setSampleConfigurationsObject(setContainer);
          setSetsLoadingState(MetaDataLoadingState.Succeeded);
          return;
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setSetsLoadingState(MetaDataLoadingState.Failed);
    };

    // Call fetchData when the proposalId changes
    fetchData();
    appConfig.log('Called fetchData');

  }, [setsLoadingState, scanTypesLoadingState]);


  useEffect(() => {
    if (proposalId === undefined) {
      appConfig.log('MetadataProvider given undefined proposalId');
      return;
    }
    if (groupId === undefined) {
      appConfig.log('MetadataProvider given undefined groupId');
    } else {
      appConfig.log('MetadataProvider given groupId: ' + groupId);
    }
    appConfig.log('MetadataProvider given proposalId: ' + proposalId);
    setSetsLoadingState(MetaDataLoadingState.Pending);
  }, [proposalId]);


  // A callback for when a child component makes a change to the SampleConfigurationSets instance.
  // Note: In the future it may be prudent to pass a set ID into this,
  // to trigger separate server data update calls for each set, since each will have its own history.
  function changed() {
    appConfig.log("Called changed() in MetadataProvider.");
    setChangeCounter(changeCounter + 1);
  };


  useEffect(() => {
    var s = MetaDataLoadingState.Pending;
    if ((setsLoadingState == MetaDataLoadingState.Succeeded) &&
        (scanTypesLoadingState == MetaDataLoadingState.Succeeded)) {
      s = MetaDataLoadingState.Succeeded;
    }
    setLoadingState(s);
  }, [setsLoadingState, scanTypesLoadingState]);


  return (
    <MetadataContext.Provider value={{
        groupId: groupId,
        proposalId: proposalId,
        sets: sampleConfigurationsObject,
        scanTypes: scanTypes,
        loadingState: loadingState,
        setsLoadingState: setsLoadingState,
        scanTypesLoadingState: scanTypesLoadingState,
        changed: changed,
        changeCounter: changeCounter
    }}>
    {props.children}
    </MetadataContext.Provider>
  )
}

export { MetadataContext, MetadataProvider, MetaDataLoadingState }