import React, { useState, useEffect, useContext } from 'react';
import { useParams } from "react-router-dom"
import 'bulma/css/bulma.min.css';

import './barTable.css'
import { Guid } from './components/utils.tsx'
import { SampleConfigurationSet } from './sampleConfiguration.ts'
import { SampleConfigurationContext } from './sampleConfigurationProvider.tsx'

function BarTable() {

  const { proposalId } = useParams();

  const sampleSetContext = useContext(SampleConfigurationContext);
  const [bars, setBars] = useState<SampleConfigurationSet[]>([]);


  useEffect(() => {
    console.log('barTable says setId, setsLoaded, scanTypesLoaded changed');

    if (proposalId === undefined) { throw new Error("Project ID not defined"); }
    const s = proposalId.trim()
    if (!s) { throw new Error("Project ID is blank"); }

    if (!sampleSetContext.setsLoaded) { console.log("sets not loaded"); return; }
    if (!sampleSetContext.scanTypesLoaded) { console.log("scanTypes not loaded"); return; }

    setBars(sampleSetContext.instance.all());
  }, [proposalId, sampleSetContext.setsLoaded, sampleSetContext.scanTypesLoaded]);


  return (
    <>
      <table className="bartable">
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

export default BarTable
