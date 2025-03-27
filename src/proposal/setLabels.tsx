import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { SampleConfigurationSet } from '../sampleConfiguration.ts';
import { MetadataContext, MetaDataLoadingState } from '../metadataProvider.tsx';
import { LoadingBanner, LoadingState } from '../components/loadingBanner.tsx';
import SetLabel from './setLabel.tsx';
import './setLabels.css';


const SetLabels: React.FC = () => {

  const { proposalId } = useParams();

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

      <nav className="breadcrumb is-medium do-not-print" aria-label="breadcrumbs">
        <ul>
          <li><Link to={ "/" }>Proposals</Link></li>
          <li><Link to={ "/proposal/" + proposalId }>{ metadataContext.sets.name }</Link></li>
          <li className="is-active"><Link to={ "/proposal/" + proposalId + "/labels" }>Printable Labels</Link></li>
        </ul>
      </nav>

      <nav className="level do-not-print">
        <div className="level-left">
          <div className="level-item">
            <p className="subtitle is-5"><strong>{ sets.length }</strong> bars</p>
          </div>
        </div>
      </nav>

      <div className="block">
        { sets.length == 0 ? (
          <p>( There are no Sets defined for this proposal yet, so there are no labels to print. )</p>
        ) : (
          <>
            {
              sets.map((set) => {
                return (
                  <Link to={ "../set/" + set.id }>
                    <SetLabel
                      key={set.id}
                      setId={set.id}
                      setName={set.name}
                      proposalName={metadataContext.sets.name} />
                  </Link>
                );
              })
            }
          </>
        )}
      </div>
    </>
  )
}

export default SetLabels
