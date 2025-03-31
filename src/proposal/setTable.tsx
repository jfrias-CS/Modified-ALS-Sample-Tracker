import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { SampleConfigurationSet } from '../sampleConfiguration.ts';
import { MetadataContext, MetaDataLoadingState } from '../metadataProvider.tsx';
import { LoadingBanner, LoadingState } from '../components/loadingBanner.tsx';
import AddSets from './addSets.tsx';
import './setTable.css';


const SetTable: React.FC = () => {

  var { proposalId } = useParams();
  proposalId = proposalId ? proposalId : "";

  const metadataContext = useContext(MetadataContext);
  const [sets, setSets] = useState<SampleConfigurationSet[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    if (metadataContext.setsLoadingState == MetaDataLoadingState.Failed) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Failed to load Sets. Are you sure you're still logged in?");
    } else if (metadataContext.loadingState == MetaDataLoadingState.Succeeded) {
      const sortedSets = metadataContext.sets.all().sort((a, b) => a.name.localeCompare(b.name));
      setSets(sortedSets);
      setLoading(LoadingState.Success);
    }
  }, [metadataContext.changeCounter, metadataContext.setsLoadingState, metadataContext.loadingState]);

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
          <li className="is-active"><Link to={ "/proposal/" + proposalId }>{ metadataContext.sets.name }</Link></li>
        </ul>
      </nav>

      <nav className="level">
        <div className="level-left">
          <div className="level-item">
            <p className="subtitle is-5"><strong>{ sets.length }</strong> bars</p>
          </div>
        </div>

        <div className="level-right">
          <div className="level-item">
              <p className="subtitle is-5"><Link to={ "labels" }>Printable Labels</Link></p>
          </div>
          <div className="level-item">
            <AddSets />
          </div>
        </div>
      </nav>

      <div className="block">
        { sets.length == 0 ? (
          <p>( Use the Add button on the right to add Bars. )</p>
        ) : (
          <>
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
                          <th className="barname" scope="row"><Link to={ "set/" + set.id }>{ set.name }</Link></th>
                          <td>{ set.description }</td>
                          <td>{ set.configurationsById.size }</td>
                      </tr>);
                  })
                }
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  )
}

export default SetTable
