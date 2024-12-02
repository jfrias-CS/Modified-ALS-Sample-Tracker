import { createContext, useState, useEffect, PropsWithChildren } from "react";

import { Guid } from "./components/utils.tsx";
import { ScanTypes, getScanTypes } from './scanTypes.ts';
import { SampleConfiguration, SampleConfigurationSets } from './sampleConfiguration.ts';
import { RecordFromServer, readConfigsForProposalId } from './sampleConfigurationDb.ts';


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
                    sets: new SampleConfigurationSets("empty", "0" as Guid), // Should never be reached
                    scanTypes: {typesByName:new Map(),typeNamesInDisplayOrder:[],parametersById:new Map()},
                    setsLoaded: false,
                    scanTypesLoaded: false,
                    changed: () => {},
                    changeCounter: 0
                  });

const SampleConfigurationProvider: React.FC<PropsWithChildren<ProviderProps>> = (props) => {
  const [proposalId, setProposalId] = useState<string | undefined>(props.proposalId);

  const [sampleConfigurationsObject, setSampleConfigurationsObject] = useState<SampleConfigurationSets>(new SampleConfigurationSets("empty", "0" as Guid));
  const [scanTypes, setScanTypes] = useState<ScanTypes>({typesByName:new Map(),typeNamesInDisplayOrder:[],parametersById:new Map()});

  const [setsLoaded, setSetsLoaded] = useState<boolean>(false);
  const [scanTypesLoaded, setScanTypesLoaded] = useState<boolean>(false);

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

        const result = await readConfigsForProposalId(p);
        console.log(result);
        if (result.success) {
          ingestFromServer(result.response!);
        }
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

  function ingestFromServer(records: RecordFromServer[]) {
    console.log("Calling ingestFromServer");

    var setRecords:RecordFromServer[] = [];
    var configRecords:RecordFromServer[] = [];
    records.forEach((s) => {
      // Skip any records that don't have a sampleCharacteristics object.
      // They will definitely not contain enough information to be useful.
      if (!s.sampleCharacteristics) { return; }
      // Skip any records that claim to be invalid.
      // These may be detritus from incomplete undo purging in a previous session.
      if (!(s.sampleCharacteristics.lbnl_config_meta_valid)) { return; }
      // Separate the records into "set" and "configuration" buckets
      if (s.sampleCharacteristics.lbnl_config_meta_type == 'set') { setRecords.push(s); }
      else if (s.sampleCharacteristics.lbnl_config_meta_type == 'configuration') { configRecords.push(s); }
    });

    // Create a master container for all our sets
    const setContainer = new SampleConfigurationSets(proposalId!, proposalId as Guid);
    setContainer.setScanTypes(scanTypes);

    // Add a new SampleConfigurationSet object for each record we got that looks like one.
    setRecords.forEach((r) => { setContainer.add(
                                    r.id as Guid,
                                    r.description,
                                    r.sampleCharacteristics.lbnl_config_meta_description || "")
    });

    // Everything else in the sampleCharacteristics object that's prefixed with "lbnl_config_" will
    // be treated as the name of a Scan Type parameter.
    const characeristicsToIgnore:Set<string> = new Set(
      ["lbnl_config_meta_type", "lbnl_config_meta_valid", "lbnl_config_meta_description", "lbnl_config_meta_set_id",
       "lbnl_config_meta_scan_type", "lbnl_config_meta_mm_from_left_edge"]
    );

    configRecords.forEach((r) => {
      const sc = r.sampleCharacteristics;
      const setId = sc.lbnl_config_meta_set_id;
      if (!setId) { return; }
      const thisSet = setContainer.getById(setId);
      if (!thisSet) { return; }

      const parameters:Map<Guid, string|null> = new Map();

      // Anything in sampleCharacteristics that starts with lbnl_config_ and not lbnl_config_meta_
      // is treated as a Scan Type parameter and its value is added to the parameter set.
      for (const [key, value] of Object.entries(sc)) {
        if (!(key.startsWith('lbnl_config_'))) { return; }
        if (characeristicsToIgnore.has(key)) { return; }
        parameters.set(key.replace(/lbnl_config_/, '') as Guid, value as string);
      }

      const newSample = new SampleConfiguration({
        id: r.id as Guid,
        mmFromLeftEdge: sc.lbnl_config_meta_mm_from_left_edge,
        name: r.description,
        description: sc.lbnl_config_meta_description,
        scanType: sc.lbnl_config_meta_scan_type,
        parameters: parameters
      });

      thisSet.add(newSample);
    });

    setSampleConfigurationsObject(setContainer);
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