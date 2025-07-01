import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { sortWithNumberParsing } from '../../components/utils.tsx';
import { SampleConfigurationSet } from '../../sampleConfiguration.ts';
import { GroupContext } from '../groupProvider.tsx';
import { MetadataContext, MetaDataLoadingState } from '../../metadataProvider.tsx';
import { LoadingBanner, LoadingState } from '../../components/loadingBanner.tsx';
import AddSets from './addSets.tsx';
import DeleteSet from './set/deleteSet.tsx'
import './setTable.css';


const SetTable: React.FC = () => {

  var { proposalId } = useParams();
  proposalId = proposalId || "";

  const groupContext = useContext(GroupContext);
  const metadataContext = useContext(MetadataContext);
  const [sets, setSets] = useState<SampleConfigurationSet[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState<boolean>(false);

  useEffect(() => {
    if (metadataContext.setsLoadingState == MetaDataLoadingState.Failed) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Failed to load Sets. Are you sure you're still logged in?");
    } else if (metadataContext.loadingState == MetaDataLoadingState.Succeeded) {
      const sortedSets = metadataContext.sets.allValid().sort((a, b) => { return sortWithNumberParsing(a.name, b.name)});
      setSets(sortedSets);
      setLoading(LoadingState.Success);
    }
  }, [metadataContext.changeCounter, metadataContext.setsLoadingState, metadataContext.loadingState]);

  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  if (loading != LoadingState.Success) {
    return (<LoadingBanner state={loading} message={loadingMessage}></LoadingBanner>)
  }

  function refreshSets() {
    const sortedSets = metadataContext.sets.allValid().sort((a,b) => sortWithNumberParsing(a.name, b.name));
    setSets(sortedSets);
  }

  return (
    <>

      <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
        <ul>
          <li><Link to={ "/group/" + groupContext.group!.id }>Proposals</Link></li>
          <li className="is-active"><Link to={ "/group/" + groupContext.group!.id + "/proposal/" + metadataContext.proposalId }>{ metadataContext.sets.name }</Link></li>
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
            <AddSets />
          </div>
          <div className="level-item">
              <p className="subtitle is-5"><Link to={ "labels" }>Printable Labels</Link></p>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {
                  sets.map((set) => (
                      <tr key={set["id"]}>
                          <th className="barname" scope="row">
                              <Link to={ "set/" + set.id }>{ set.name }</Link>
                          </th>
                          <td>{ set.description }</td>
                          <td>{ set.configurationsById.size }</td>
                          <td>
              <DeleteSet 
                setId={set.id}
                trigger={<button className="button is-danger">Delete</button>}
                onSuccess={() => {
                  setShowDelete(false);
                  setSelectedSetId(null);
                  refreshSets();
                }}
                />
                          </td>
                      </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  )
}

export default SetTable
