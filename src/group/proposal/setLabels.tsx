import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { sortWithNumberParsing } from '../../components/utils.tsx';
import { SampleConfigurationSet } from '../../sampleConfiguration.ts';
import { GroupContext } from '../groupProvider.tsx';
import { MetadataContext, MetaDataLoadingState } from '../../metadataProvider.tsx';
import { LoadingBanner, LoadingState } from '../../components/loadingBanner.tsx';
import SetLabel from './setLabel.tsx';
import './setLabels.css';


const SetLabels: React.FC = () => {

  const groupContext = useContext(GroupContext);
  const metadataContext = useContext(MetadataContext);
  const [sets, setSets] = useState<SampleConfigurationSet[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [marginAfterHorizontal, setMarginAfterHorizontal] = useState<string>("3.475");
  const [marginAfterVertical, setMarginAfterVertical] = useState<string>("3.375");
  
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

  function changedMarginAfterHorizontal(c:React.ChangeEvent<HTMLInputElement>) {
    const v = c.target.value;
    setMarginAfterHorizontal(v);
  }

  function changedMarginAfterVertical(c:React.ChangeEvent<HTMLInputElement>) {
    const v = c.target.value;
    setMarginAfterVertical(v);
  }

  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  if (loading != LoadingState.Success) {
    return (<LoadingBanner state={loading} message={loadingMessage}></LoadingBanner>)
  }

  return (
    <>

      <nav className="breadcrumb is-medium do-not-print" aria-label="breadcrumbs">
        <ul>
          <li><Link to={ "/group/" + groupContext.group!.id }>{ groupContext.group!.name }</Link></li>
          <li><Link to={ "/group/" + groupContext.group!.id + "/proposal/" + metadataContext.proposalId }>{ metadataContext.sets.name }</Link></li>
          <li className="is-active"><Link to={ "/group/" + groupContext.group!.id + "/proposal/" + metadataContext.proposalId + "/labels" }>Printable Labels</Link></li>
        </ul>
      </nav>

      <nav className="level do-not-print">
        <div className="level-left">
          <div className="level-item">
            <p className="subtitle is-5"><strong>{ sets.length }</strong> bar labels, 50.5mm x 12.5mm each (<a href="https://www.onlinelabels.com/products/ol820wx">Compatible example</a>)</p>
          </div>
        </div>
      </nav>

      <nav className="level do-not-print">
        <div className="level-left">
          <div className="level-item">
            <p className="subtitle is-6">Horizontal spacing of</p>
          </div>
          <div className="level-item">
            <input className="input"
                  type="text"
                  size={5}
                  value={ marginAfterHorizontal }
                  onChange={ changedMarginAfterHorizontal } />
          </div>
          <div className="level-item">
            <p className="subtitle is-6">mm,</p>
          </div>
          <div className="level-item">
            <p className="subtitle is-6">vertical spacing of</p>
          </div>
          <div className="level-item">
            <input className="input"
                    type="text"
                    size={5}
                    value={ marginAfterVertical }
                    onChange={ changedMarginAfterVertical } />
          </div>
          <div className="level-item">
            <p className="subtitle is-6">mm.</p>
          </div>
          <div>
            <input
              type="button"
              className="button is-success"
              onClick={ () => window.print() }
              value="Print" />
          </div>
        </div>
      </nav>

      <div className="block setLabels">
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
                      proposalName={metadataContext.sets.name}
                      marginAfterHorizontal={marginAfterHorizontal}
                      marginAfterVertical={marginAfterVertical} />
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
