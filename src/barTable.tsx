import React, { useState, useEffect, createContext, useContext } from 'react';
import 'bulma/css/bulma.min.css';

import './barTable.css'
import { ScanTypeName, ScanType } from './scanTypes.ts'
import { Guid } from './components/utils.ts'
import { SampleConfiguration } from './sampleConfiguration.ts'
import { SampleConfigurationContext } from './sampleConfigurationProvider.tsx'

function BarTable() {

  const sampleSetContext = useContext(SampleConfigurationContext);

  useEffect(() => {

    console.log('Table component mounted');
    const fetchData = async () => {
      try {

        const requestInfo: RequestInfo = new Request("http://backend.localhost/api/v3/datasets", {
              method: "GET"
          //    body: '{"foo": "bar"}',
            });

        // Ideally this should _not_ await.
        const response = await fetch(requestInfo);
        
        const result = await response.json();
        // TODO: Add a conversion loop in here to translate

        const fakeStartData: SampleConfiguration[] = [
        ];

        sampleSetContext.instance.addOrReplace(fakeStartData);
        sampleSetContext.refresh();
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    // Call fetchData when the component mounts
    fetchData();
    return () => {
        console.log('Table component unmounted');
    };
  }, []);


  useEffect(() => {
    console.log('Table says samples have changed');
  }, [sampleSetContext.sampleConfigurations]);


  var headers = [
      (<th key="mm" scope="col">From Left Edge</th>),
      (<th key="name" scope="col">Name</th>),
      (<th key="description" scope="col">Description</th>),
      (<th key="scantype" scope="col">Scan Type</th>)
  ];

  return (
    <>
      <table className="bartable">
        <thead>
          <tr key="headers">
            { headers }
          </tr>
        </thead>
        <tbody>
          {
            sampleSetContext.sampleConfigurations.map((sample) => {
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

export default BarTable
