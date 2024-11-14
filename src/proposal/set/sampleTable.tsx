import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { Guid } from '../../components/utils.tsx';
import { SampleConfiguration } from '../../sampleConfiguration.ts';
import { SampleConfigurationContext } from '../../sampleConfigurationProvider.tsx';
import { LoadingBanner, LoadingState } from '../../components/loadingBanner.tsx';
import AddSamples from './addSamples.tsx';
import ImportSamples from './importSamples.tsx';
import './sampleTable.css';


const SampleTable: React.FC = () => {

  const { proposalId, setId } = useParams();

  const sampleSetContext = useContext(SampleConfigurationContext);
  const [sampleConfigurations, setSampleConfigurations] = useState<SampleConfiguration[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");


  useEffect(() => {
    console.log(`sampleTable setId:${setId} changeCounter:${sampleSetContext.changeCounter} setsLoaded:${sampleSetContext.setsLoaded} scanTypesLoaded:${sampleSetContext.scanTypesLoaded}`);

    if ((setId === undefined) || (!setId.trim())) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Invalid Set ID");
      return;
    }
    const s = setId.trim()

    if (!sampleSetContext.setsLoaded || !sampleSetContext.scanTypesLoaded) {
      setLoading(LoadingState.Loading);
      setLoadingMessage("");
      return;
    }

    const thisSet = sampleSetContext.sets.setsById.get(s as Guid);

    if (thisSet === undefined) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Set ID not found in Proposal");
      return;
    }

    setSampleConfigurations(thisSet.all());
    setLoading(LoadingState.Success);

  }, [setId, sampleSetContext.changeCounter, sampleSetContext.setsLoaded, sampleSetContext.scanTypesLoaded]);

  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  const set = sampleSetContext.sets.getById(setId!.trim() as Guid)

  if ((loading != LoadingState.Success) || !set) {
    return (<LoadingBanner state={loading} message={loadingMessage}></LoadingBanner>)
  }

  var headers = [
      (<th key="mm" scope="col">From Left Edge</th>),
      (<th key="name" scope="col">Name</th>),
      (<th key="description" scope="col">Description</th>),
      (<th key="scantype" scope="col">Scan Type</th>)
  ];

  return (
    <>

      <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
        <ul>
          <li><Link to={ "/" }>Proposals</Link></li>
          <li><Link to={ "/proposal/" + proposalId }>{ sampleSetContext.sets.name }</Link></li>
          <li className="is-active"><Link to={ "/proposal/" + proposalId + "/set/" + setId }>{ set.name }</Link></li>
        </ul>
      </nav>

      <h4 className="subtitle is-4">General Information</h4>

      <h4 className="subtitle is-4">Samples</h4>

      <nav className="level">
        <div className="level-left">
          <div className="level-item">
            <div className="field has-addons">
              <div className="control">
                <input className="input" type="text" placeholder="Search" />
              </div>
            </div>
          </div>
          <div className="level-item">
            <p className="subtitle is-5"><strong>{ sampleConfigurations.length }</strong> samples</p>
          </div>
          <div className="level-item">
            <ImportSamples />
          </div>
          <div className="level-item">
            <AddSamples />
          </div>
        </div>

        <div className="level-right">
          <div className="level-item">
            <a className="button is-success">Save Changes</a>
          </div>
        </div>
      </nav>

      <table className="sampletable">
        <thead>
          <tr key="headers">
            { headers }
          </tr>
        </thead>
        <tbody>
          {
            sampleConfigurations.map((sample) => {
              return (
                <tr key={sample["id"]}>
                    <td>{ sample.mmFromLeftEdge.toString() + "mm" }</td>
                    <th scope="row">{ sample.name }</th>
                    <td>{ sample.description }</td>
                    <td>{ sample.scanType }</td>
                </tr>);
            })
          }
        </tbody>
      </table>
    </>
  )
}

export default SampleTable
