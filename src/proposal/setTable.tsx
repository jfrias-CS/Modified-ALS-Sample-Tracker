import React, { useState, useEffect, useContext } from 'react';
import 'bulma/css/bulma.min.css';

import { Guid } from '../components/utils.tsx';
import { SampleConfigurationSet } from '../sampleConfiguration.ts';
import { SampleConfigurationContext } from '../sampleConfigurationProvider.tsx';
import { LoadingBanner, LoadingState } from '../components/loadingBanner.tsx';
import AddSet from './addSet.tsx';
import './setTable.css';


function SetTable() {

  const sampleSetContext = useContext(SampleConfigurationContext);
  const [bars, setBars] = useState<SampleConfigurationSet[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    console.log('setTable says changeCounter, setsLoaded, scanTypesLoaded changed');

    if (!sampleSetContext.setsLoaded || !sampleSetContext.scanTypesLoaded) {
      setLoading(LoadingState.Loading);
      setLoadingMessage("");
      return;
    }

    setBars(sampleSetContext.sets.all());
    setLoading(LoadingState.Success);

  }, [sampleSetContext.changeCounter, sampleSetContext.setsLoaded, sampleSetContext.scanTypesLoaded]);

  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  if (loading != LoadingState.Success) {
    return (<LoadingBanner state={loading} message={loadingMessage}></LoadingBanner>)
  }

  return (
    <>
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
            <p className="subtitle is-5"><strong>{ bars.length }</strong> bars</p>
          </div>
          <div className="level-item">
            <AddSet />
          </div>
        </div>

        <div className="level-right">
          <div className="level-item">
            <a className="button is-success">Save Changes</a>
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
            bars.map((bar) => {
              return (
                <tr key={bar["id"]}>
                    <th scope="row">{ bar.name }</th>
                    <td>{ bar.description }</td>
                    <td>{ bar.configurationsById.size }</td>
                </tr>);
            })
          }
        </tbody>
      </table>
    </>
  )
}

export default SetTable
