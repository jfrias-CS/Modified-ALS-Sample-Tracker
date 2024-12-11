import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { SampleConfigurationSet } from '../sampleConfiguration.ts';
import { SampleConfigurationContext, ProviderLoadingState } from '../sampleConfigurationProvider.tsx';
import { LoadingBanner, LoadingState } from '../components/loadingBanner.tsx';
import SetLabel from './setLabel.tsx';


const SetLabels: React.FC = () => {

  const { proposalId } = useParams();

  const configContext = useContext(SampleConfigurationContext);
  const [sets, setSets] = useState<SampleConfigurationSet[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    if (configContext.setsLoadingState == ProviderLoadingState.Failed) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Failed to load Sets. Are you sure you're still logged in?");
    } else if (configContext.loadingState == ProviderLoadingState.Succeeded) {
      const sortedSets = configContext.sets.all().sort((a, b) => a.name.localeCompare(b.name));
      setSets(sortedSets);
      setLoading(LoadingState.Success);
    }
  }, [configContext.changeCounter, configContext.setsLoadingState, configContext.loadingState]);

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
          <li><Link to={ "/proposal/" + proposalId }>{ configContext.sets.name }</Link></li>
          <li className="is-active"><Link to={ "/proposal/" + proposalId + "/labels" }>Printable Labels</Link></li>
        </ul>
      </nav>

      <nav className="level">
        <div className="level-left">
          <div className="level-item">
            <p className="subtitle is-5"><strong>{ sets.length }</strong> sets</p>
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
                      proposalName={configContext.sets.name} />
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
