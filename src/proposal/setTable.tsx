import React, { useState, useEffect, useContext } from 'react';
import { useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { Guid } from '../components/utils.tsx';
import { SampleConfigurationSet } from '../sampleConfiguration.ts';
import { SampleConfigurationContext } from '../sampleConfigurationProvider.tsx';
import { LoadingBanner, LoadingState } from '../components/loadingBanner.tsx';
import './setTable.css';


function SetTable() {

  const { proposalId } = useParams();

  const sampleSetContext = useContext(SampleConfigurationContext);
  const [bars, setBars] = useState<SampleConfigurationSet[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    console.log('setTable says setId, setsLoaded, scanTypesLoaded changed');

    if ((proposalId === undefined) || (!proposalId.trim())) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Invalid Proposal ID");
      return;
    }

    if (!sampleSetContext.setsLoaded || !sampleSetContext.scanTypesLoaded) {
      setLoading(LoadingState.Loading);
      setLoadingMessage("");
      return;
    }

    setBars(sampleSetContext.instance.all());
    setLoading(LoadingState.Success);

  }, [proposalId, sampleSetContext.setsLoaded, sampleSetContext.scanTypesLoaded]);

  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  if (loading != LoadingState.Success) {
    return (<LoadingBanner state={loading} message={loadingMessage}></LoadingBanner>)
  }

  return (
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
