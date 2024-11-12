import React, { useState, useEffect, useContext } from 'react';
import { useParams } from "react-router-dom"
import 'bulma/css/bulma.min.css';

import './sampleTable.css'
import { Guid } from './components/utils.ts'
import { SampleConfiguration } from './sampleConfiguration.ts'
import { SampleConfigurationContext } from './sampleConfigurationProvider.tsx'
import AddSamples from './addSamples.tsx'
import ImportSamples from './importSamples.tsx'


const SampleTable: React.FC = () => {

  const { setId } = useParams();

  const sampleSetContext = useContext(SampleConfigurationContext);
  const [sampleConfigurations, setSampleConfigurations] = useState<SampleConfiguration[]>([]);


  useEffect(() => {
    console.log('sampleTable says setId, setsLoaded, scanTypesLoaded changed');

    if (setId === undefined) { throw new Error("Set ID not defined"); }
    const s = setId.trim()
    if (!s) { throw new Error("Set ID is blank"); }

    if (!sampleSetContext.setsLoaded) { console.log("sets not loaded"); return; }
    if (!sampleSetContext.scanTypesLoaded) { console.log("scanTypes not loaded"); return; }

    const thisSet = sampleSetContext.instance.setsById.get(s as Guid);

    if (thisSet === undefined) { throw new Error("Set ID " + s + " does not exist in ConfigurationSet"); }

    setSampleConfigurations(thisSet.all());
  }, [setId, sampleSetContext.setsLoaded, sampleSetContext.scanTypesLoaded]);

  var headers = [
      (<th key="mm" scope="col">From Left Edge</th>),
      (<th key="name" scope="col">Name</th>),
      (<th key="description" scope="col">Description</th>),
      (<th key="scantype" scope="col">Scan Type</th>)
  ];

  const sampleCount = sampleConfigurations.length;

  return (
    <>
      <h4 className="subtitle is-4">General Information</h4>


      <h4 className="subtitle is-4">Samples</h4>

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
            <p className="subtitle is-5"><strong>{ sampleCount }</strong> samples</p>
          </div>
          <div className="level-item">
            <ImportSamples />
          </div>
          <div className="level-item">
            <AddSamples />
          </div>
        </div>

        <div className="level-right">
          <div className="level-item">
            <a className="button is-success">Save Changes</a>
          </div>
        </div>
      </nav>

      <table className="sampletable">
        <thead>
          <tr key="headers">
            { headers }
          </tr>
        </thead>
        <tbody>
          {
            sampleConfigurations.map((sample) => {
              return (
                <tr key={sample["name"]}>
                    <td>{ sample.mmFromLeftEdge.toString() + "mm" }</td>
                    <th scope="row">{ sample.name }</th>
                    <td>{ sample.description }</td>
                    <td>{ sample.scanType }</td>
                </tr>);
            })
          }
        </tbody>
      </table>
    </>
  )
}

export default SampleTable
