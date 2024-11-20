import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { Guid } from '../../components/utils.tsx';
import { SampleConfiguration } from '../../sampleConfiguration.ts';
import { SampleConfigurationContext } from '../../sampleConfigurationProvider.tsx';
import { LoadingBanner, LoadingState } from '../../components/loadingBanner.tsx';
import AddSamples from './addSamples.tsx';
import ImportSamples from './importSamples.tsx';
import { InputEditable, EditFunctions, ValidationStatus } from '../../components/inputEditable.tsx';
import { SampleCell, CellFunctions, CellValidationStatus } from './sampleCell.tsx';
import './sampleTable.css';


const SampleTable: React.FC = () => {

  const { proposalId, setId } = useParams();

  const sampleSetContext = useContext(SampleConfigurationContext);
  const [sampleConfigurations, setSampleConfigurations] = useState<SampleConfiguration[]>([]);
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState<LoadingState>(LoadingState.Loading);
  const [loadingMessage, setLoadingMessage] = useState("");


  useEffect(() => {
    console.log(`sampleTable setId:${setId} changeCounter:${sampleSetContext.changeCounter} setsLoaded:${sampleSetContext.setsLoaded} scanTypesLoaded:${sampleSetContext.scanTypesLoaded}`);

    if ((setId === undefined) || (!setId.trim())) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Invalid Set ID");
      return;
    }

    if (!sampleSetContext.setsLoaded || !sampleSetContext.scanTypesLoaded) {
      setLoading(LoadingState.Loading);
      setLoadingMessage("");
      return;
    }

    const thisSet = sampleSetContext.sets.getById(setId.trim() as Guid);

    if (thisSet === undefined) {
      setLoading(LoadingState.Failure);
      setLoadingMessage("Set ID not found in Proposal");
      return;
    }

    const sortedSamples = thisSet.all().sort((a, b) => a.mmFromLeftEdge - b.mmFromLeftEdge);
    setSampleConfigurations(sortedSamples);
    setDescription(thisSet.description);

    setLoading(LoadingState.Success);

  }, [setId, sampleSetContext.changeCounter, sampleSetContext.setsLoaded, sampleSetContext.scanTypesLoaded]);

  // If we're in any loading state other than success,
  // display a loading banner instead of the content.
  const set = sampleSetContext.sets.getById(setId!.trim() as Guid)

  const editFunctions: EditFunctions = {
    validator: async () => { return { status: ValidationStatus.Success } },
    submit: async (value: string) => {
              set!.description = value;
              setDescription(value);
              return { status: ValidationStatus.Success }
            },
  };


  if ((loading != LoadingState.Success) || !set) {
    return (<LoadingBanner state={loading} message={loadingMessage}></LoadingBanner>)
  }

  var tableHeaders = [
      (<th key="mm" scope="col">From Left Edge</th>),
      (<th key="name" scope="col">Name</th>),
      (<th key="description" scope="col">Description</th>),
      (<th key="scantype" scope="col">Scan Type</th>)
  ];

  const displayedParameterIds = set.relevantParameters.filter((p) => sampleSetContext.scanTypes.parametersById.has(p));
  const displayedParameters = displayedParameterIds.map((p) => sampleSetContext.scanTypes.parametersById.get(p)!);

  displayedParameters.forEach((p) => {
    tableHeaders.push((<th key={p.id} scope="col">{ p.name }</th>));
  });

  const cellFunctions: CellFunctions = {
    validator: () => { return { status: CellValidationStatus.Success, message: null }; },
    save: () => { return { status: CellValidationStatus.Success, message: null }; },
    up: () => { return CellValidationStatus.Success; },
    down: () => { return CellValidationStatus.Success; },
    left: () => { return CellValidationStatus.Success; },
    right: () => { return CellValidationStatus.Success; }
  }

  return (
    <>

      <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
        <ul>
          <li><Link to={ "/" }>Proposals</Link></li>
          <li><Link to={ "/proposal/" + proposalId }>{ sampleSetContext.sets.name }</Link></li>
          <li className="is-active"><Link to={ "/proposal/" + proposalId + "/set/" + setId }>{ set.name }</Link></li>
        </ul>
      </nav>

      <div className="field">
        <InputEditable
            label="Description"
            elementId="sampletable-description"
            value={set.description}
            placeholder="Describe this sample"
            showHelp={true}
            editFunctions={editFunctions} />
      </div>

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
            <p className="subtitle is-5"><strong>{ sampleConfigurations.length }</strong> samples</p>
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
            { tableHeaders }
          </tr>
        </thead>
        <tbody>
          {
            sampleConfigurations.map((sample, sampleIndex) => {
              var cells: JSX.Element[] = [];

              const allowedParameters = new Set(sampleSetContext.scanTypes.typesByName.get(sample.scanType)!.parameters);

              displayedParameters.forEach((p, paramIndex) => {
                const unused = !allowedParameters.has(p.id);
                const td = (<SampleCell x={paramIndex+4} y={sampleIndex}
                              elementKey={ p.id }
                              isUnused={unused}
                              cellFunctions={cellFunctions}
                              value={ sample.parameters[p.id] ?? "" } />) ;
                cells.push(td);
              });

              return (
                <tr key={sample["id"]}>
                  <SampleCell x={0} y={sampleIndex} elementKey="mm" cellFunctions={cellFunctions} value={ sample.mmFromLeftEdge.toString() } />
                  <SampleCell x={1} y={sampleIndex} elementKey="name" cellFunctions={cellFunctions} value={ sample.name } />
                  <SampleCell x={2} y={sampleIndex} elementKey="description" cellFunctions={cellFunctions} value={ sample.description } />
                  <SampleCell x={3} y={sampleIndex} elementKey="scantype" cellFunctions={cellFunctions} value={ sample.scanType } />
                  { cells }
                </tr>);
            })
          }
        </tbody>
      </table>
    </>
  )
}

export default SampleTable
