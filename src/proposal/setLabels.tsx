import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { SampleConfigurationSet } from '../sampleConfiguration.ts';
import { SampleConfigurationContext, ProviderLoadingState } from '../sampleConfigurationProvider.tsx';
import { LoadingBanner, LoadingState } from '../components/loadingBanner.tsx';
import { QrCodeImage } from './../components/qrcode/qrCodeImage.tsx';
import { QrEncoding, QrErrorCorrectionLevel } from './../components/qrcode/qrCodeTypes.ts';
import './setLabels.css';


const SetLabels: React.FC = () => {

  const { proposalId } = useParams();

  const configContext = useContext(SampleConfigurationContext);
  const [sets, setSets] = useState<SampleConfigurationSet[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    console.log(`setLabels changeCounter:${configContext.changeCounter} setsLoadingState:${configContext.setsLoadingState} scanTypesLoadingState:${configContext.scanTypesLoadingState}`);

    if ((configContext.setsLoadingState != ProviderLoadingState.Succeeded) ||
        (configContext.scanTypesLoadingState != ProviderLoadingState.Succeeded)) {
      if (configContext.setsLoadingState == ProviderLoadingState.Failed) {
        setLoading(LoadingState.Failure);
        setLoadingMessage("Failed to load Sets. Are you sure you're still logged in?");
      } else {
        setLoading(LoadingState.Loading);
        setLoadingMessage("");
      }
      return;
    }

    const sortedSets = configContext.sets.all().sort((a, b) => a.name.localeCompare(b.name));

    setSets(sortedSets);
    setLoading(LoadingState.Success);

  }, [configContext.changeCounter, configContext.setsLoadingState, configContext.scanTypesLoadingState]);

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
          <li className="is-active"><Link to={ "/proposal/" + proposalId }>{ configContext.sets.name }</Link></li>
        </ul>
      </nav>

        <QrCodeImage size="5em"
          mode={QrEncoding.Alphanumeric}
          errorCorrectionLevel={QrErrorCorrectionLevel.L}
          content="hello" />

      <nav className="level">
        <div className="level-left">
          <div className="level-item">
            <p className="subtitle is-5"><strong>{ sets.length }</strong> sets</p>
          </div>
        </div>

        <div className="level-right">
          <div className="level-item">
          </div>
        </div>
      </nav>

      <div className="block">
        { sets.length == 0 ? (
          <p>( Use the Add button on the right to add Sets. )</p>
        ) : (

        <table className="setLabels">
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
        )}
      </div>
    </>
  )
}

export default SetLabels
