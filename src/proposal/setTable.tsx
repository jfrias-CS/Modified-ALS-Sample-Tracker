import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { SampleConfigurationSet } from '../sampleConfiguration.ts';
import { SampleConfigurationContext } from '../sampleConfigurationProvider.tsx';
import { LoadingBanner, LoadingState } from '../components/loadingBanner.tsx';
import AddSet from './addSets.tsx';
import './setTable.css';


const SetTable: React.FC = () => {

  const { proposalId } = useParams();

  const sampleSetContext = useContext(SampleConfigurationContext);
  const [sets, setSets] = useState<SampleConfigurationSet[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    console.log(`setTable changeCounter:${sampleSetContext.changeCounter} setsLoaded:${sampleSetContext.setsLoaded} scanTypesLoaded:${sampleSetContext.scanTypesLoaded}`);

    if (!sampleSetContext.setsLoaded || !sampleSetContext.scanTypesLoaded) {
      setLoading(LoadingState.Loading);
      setLoadingMessage("");
      return;
    }

    const sortedSets = sampleSetContext.sets.all().sort((a, b) => a.name.localeCompare(b.name));

    setSets(sortedSets);
    setLoading(LoadingState.Success);

  }, [sampleSetContext.changeCounter, sampleSetContext.setsLoaded, sampleSetContext.scanTypesLoaded]);

  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  if (loading != LoadingState.Success) {
    return (<LoadingBanner state={loading} message={loadingMessage}></LoadingBanner>)
  }

  return (
    <>

      <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
        <ul>
          <li><Link to={ "/" }>Proposals</Link></li>
          <li className="is-active"><Link to={ "/proposal/" + proposalId }>{ sampleSetContext.sets.name }</Link></li>
        </ul>
      </nav>

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
            <p className="subtitle is-5"><strong>{ sets.length }</strong> sets</p>
          </div>
        </div>

        <div className="level-right">
          <div className="level-item">
            <AddSet />
          </div>
        </div>
      </nav>

      <table className="settable">
        <thead>
          <tr key="headers">
            <th key="name" scope="col">Name</th>
            <th key="description" scope="col">Description</th>
            <th key="samplecount" scope="col">Samples</th>
          </tr>
        </thead>
        <tbody>
          {
            sets.map((set) => {
              return (
                <tr key={set["id"]}>
                    <th scope="row"><Link to={ "set/" + set.id }>{ set.name }</Link></th>
                    <td>{ set.description }</td>
                    <td>{ set.configurationsById.size }</td>
                </tr>);
            })
          }
        </tbody>
      </table>
    </>
  )
}

export default SetTable
