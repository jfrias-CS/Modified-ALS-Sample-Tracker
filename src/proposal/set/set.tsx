import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { Guid } from '../../components/utils.tsx';
import { AppConfigurationContext } from '../../appConfigurationProvider.tsx';
import { MetadataContext, ProviderLoadingState } from '../../metadataProvider.tsx';
import { LoadingBanner, LoadingState } from '../../components/loadingBanner.tsx';
import SampleTable from './sampleTable.tsx';
import { InputEditable, EditFunctions, ValidationStatus } from '../../components/inputEditable.tsx';
import { updateSet } from '../../matadataApi.ts';


const Set: React.FC = () => {

  var { proposalId, setId } = useParams();
  proposalId = proposalId ? proposalId.toLowerCase() : "";
  setId = setId ? setId.toLowerCase() : "";

  const appConfig = useContext(AppConfigurationContext);
  const metadataContext = useContext(MetadataContext);

  const [description, setDescription] = useState<string>("");

  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");


  useEffect(() => {
    appConfig.log(`set setId:${setId} changeCounter:${metadataContext.changeCounter} setsLoadingState:${metadataContext.setsLoadingState} scanTypesLoadingState:${metadataContext.scanTypesLoadingState}`);

    if ((setId === undefined) || (!setId.trim())) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Invalid Set ID");
      return;
    }

    if (metadataContext.loadingState != ProviderLoadingState.Succeeded) {
      setLoading(LoadingState.Loading);
      setLoadingMessage("");
      return;
    }

    const thisSet = metadataContext.sets.getById(setId.trim() as Guid);

    if (thisSet === undefined) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Set ID not found in Proposal");
      return;
    }

    setDescription(thisSet.description);

    setLoading(LoadingState.Success);

  }, [setId, metadataContext.changeCounter, metadataContext.loadingState]);

  const set = metadataContext.sets.getById(setId!.trim() as Guid)

  // If we're in any loading state other than success, or we can't find our set,
  // display a loading banner instead of the content.
  if ((loading != LoadingState.Success) || !set) {
    return (<LoadingBanner state={loading} message={loadingMessage}></LoadingBanner>)
  }


  async function descriptionEditSubmit(value: string) {
    const oldDescription = set!.description;
    set!.description = value;
    const result = await updateSet(set!);
    if (result.success) {
      setDescription(value);
      return { status: ValidationStatus.Success };
    } else {
      set!.description = oldDescription;
      setDescription(oldDescription);
      return { status: ValidationStatus.Failure, message: result.message };
    }
  }


  const descriptionEditFunctions: EditFunctions = {
    validator: async () => { return { status: ValidationStatus.Success } },
    submit: descriptionEditSubmit
  };


  return (
    <>

      <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
        <ul>
          <li><Link to={ "/" }>Proposals</Link></li>
          <li><Link to={ "/proposal/" + proposalId }>{ metadataContext.sets.name }</Link></li>
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
