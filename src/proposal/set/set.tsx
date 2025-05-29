import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faAngleDown } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import { Guid } from '../../components/utils.tsx';
import { AppConfigurationContext } from '../../appConfigurationProvider.tsx';
import { MetadataContext, MetaDataLoadingState } from '../../metadataProvider.tsx';
import { LoadingBanner, LoadingState } from '../../components/loadingBanner.tsx';
import DeleteSet from './deleteSet.tsx';
import SampleTable from './sampleTable.tsx';
import { InputEditable, ValidationStatus } from '../../components/inputEditable.tsx';
import { updateSet } from '../../metadataApi.ts';


const Set: React.FC = () => {

  var { proposalId, setId } = useParams();
  proposalId = proposalId || "";
  setId = setId ? setId.toLowerCase() : "";

  const appConfig = useContext(AppConfigurationContext);
  const metadataContext = useContext(MetadataContext);

  const [name, setName] = useState<string>("");
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

    if (metadataContext.loadingState != MetaDataLoadingState.Succeeded) {
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

    setName(thisSet.name);
    setDescription(thisSet.description);

    setLoading(LoadingState.Success);

  }, [setId, metadataContext.changeCounter, metadataContext.loadingState]);

  const set = metadataContext.sets.getById(setId!.trim() as Guid)

  // If we're in any loading state other than success, or we can't find our set,
  // display a loading banner instead of the content.
  if ((loading != LoadingState.Success) || !set) {
    return (<LoadingBanner state={loading} message={loadingMessage}></LoadingBanner>)
  }


  async function nameEditValidate(value: string) {
   const trimmed = value.toString().trim();
    if (trimmed.length < 1) {
      return { status: ValidationStatus.Failure, message: "Name cannot be blank." };
    } else if (metadataContext.sets.all().some((c) => c.name == trimmed)) {
      return { status: ValidationStatus.Failure, message: "Name must be unique for proposal." };
    }
    return { status: ValidationStatus.Success };
  }


  async function nameEditSubmit(value: string) {
    const oldName = set!.name;
    set!.name = value;
    const result = await updateSet(set!);
    if (result.success) {
      setName(value);
      return { status: ValidationStatus.Success };
    } else {
      set!.name = oldName;
      setName(oldName);
      return { status: ValidationStatus.Failure, message: result.message };
    }
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


  return (
    <>

      <nav className="level">
        <div className="level-left">
          <div className="level-item">

            <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
              <ul>
                <li><Link to={ "/" }>Proposals</Link></li>
                <li><Link to={ "/proposal/" + proposalId }>{ metadataContext.sets.name }</Link></li>
                <li className="is-active"><Link to={ "/proposal/" + proposalId + "/set/" + setId }>{ set.name }</Link></li>
              </ul>
            </nav>

          </div>
        </div>
        <div className="level-right">
          <div className="level-item">

            <div className="dropdown is-right is-hoverable">
              <div className="dropdown-trigger">
                <button className="button" aria-haspopup="true" aria-controls="dropdown-menu-howto">
                  <FontAwesomeIcon icon={faGear} />
                  <span className="icon is-small">
                    <FontAwesomeIcon icon={faAngleDown} />
                  </span>
                </button>
              </div>
              <div className="dropdown-menu" id="dropdown-menu-howto" role="menu">
                <div className="dropdown-content">
                  <DeleteSet />
                  <a className="dropdown-item">Clone Bar</a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </nav>

      <div className="block">
        <InputEditable
            elementId="sampletable-name"
            value={set.name}
            placeholder="Name of this bar"
            showHelp={true}
            editFunctions={{
              validator: nameEditValidate,
              submit: nameEditSubmit
            }} />
        <InputEditable
            elementId="sampletable-description"
            value={set.description}
            placeholder="Describe this bar"
            isTextArea={true}
            useCtrlToSave={false}
            showHelp={true}
            textAreaRows={2}
            editFunctions={{
              validator: async () => { return { status: ValidationStatus.Success } },
              submit: descriptionEditSubmit
            }} />
      </div>

      <SampleTable setid={setId! as Guid} />

    </>
  )
}

export default Set
