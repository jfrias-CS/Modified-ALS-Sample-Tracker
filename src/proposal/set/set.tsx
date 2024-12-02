import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { Guid } from '../../components/utils.tsx';
import { SampleConfigurationContext } from '../../sampleConfigurationProvider.tsx';
import { LoadingBanner, LoadingState } from '../../components/loadingBanner.tsx';
import SampleTable from './sampleTable.tsx';
import { InputEditable, EditFunctions, ValidationStatus } from '../../components/inputEditable.tsx';


const Set: React.FC = () => {

  const { proposalId, setId } = useParams();

  const sampleSetContext = useContext(SampleConfigurationContext);
  const [description, setDescription] = useState<string>("");

  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");


  useEffect(() => {
    console.log(`set setId:${setId} changeCounter:${sampleSetContext.changeCounter} setsLoaded:${sampleSetContext.setsLoaded} scanTypesLoaded:${sampleSetContext.scanTypesLoaded}`);

    if ((setId === undefined) || (!setId.trim())) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Invalid Set ID");
      return;
    }

    if (!sampleSetContext.setsLoaded || !sampleSetContext.scanTypesLoaded) {
      setLoading(LoadingState.Loading);
      setLoadingMessage("");
      return;
    }

    const thisSet = sampleSetContext.sets.getById(setId.trim() as Guid);

    if (thisSet === undefined) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Set ID not found in Proposal");
      return;
    }

    setDescription(thisSet.description);

    setLoading(LoadingState.Success);

  }, [setId, sampleSetContext.changeCounter, sampleSetContext.setsLoaded, sampleSetContext.scanTypesLoaded]);

  const set = sampleSetContext.sets.getById(setId!.trim() as Guid)

  // If we're in any loading state other than success, or we can't find our set,
  // display a loading banner instead of the content.
  if ((loading != LoadingState.Success) || !set) {
    return (<LoadingBanner state={loading} message={loadingMessage}></LoadingBanner>)
  }


  const descriptionEditFunctions: EditFunctions = {
    validator: async () => { return { status: ValidationStatus.Success } },
    submit: async (value: string) => {
              set!.description = value;
              setDescription(value);
              return { status: ValidationStatus.Success }
            },
  };


  return (
    <>

      <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
        <ul>
          <li><Link to={ "/" }>Proposals</Link></li>
          <li><Link to={ "/proposal/" + proposalId }>{ sampleSetContext.sets.name }</Link></li>
          <li className="is-active"><Link to={ "/proposal/" + proposalId + "/set/" + setId }>{ set.name }</Link></li>
        </ul>
      </nav>

      <div className="block">
        <InputEditable
            elementId="sampletable-description"
            value={set.description}
            placeholder="Describe this sample"
            showHelp={true}
            editFunctions={descriptionEditFunctions} />
      </div>

      <SampleTable setid={setId! as Guid} />

    </>
  )
}

export default Set
