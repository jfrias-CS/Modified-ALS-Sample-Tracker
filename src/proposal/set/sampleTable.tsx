import React, { useState, useEffect, useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faSpinner, faCheck } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import { Guid } from '../../components/utils.tsx';
import { ScanTypeName, ParameterChoice } from '../../scanTypes.ts';
import { SampleConfiguration } from '../../sampleConfiguration.ts';
import { MetadataContext, MetaDataLoadingState } from '../../metadataProvider.tsx';
import { updateConfig } from '../../metadataApi.ts';
import AddSamples from './addSamples.tsx';
import ImportSamples from './importSamples.tsx';
import { SampleTableCell } from './sampleTableCell/cell.tsx';
import { CellFunctions, CellValidationStatus, CellValidationResult, CellNavigationDirection } from './sampleTableCell/cellDto.ts';
import './sampleTable.css';


interface SampleTableProps {
  setid: Guid;
}

enum SyncState { Idle, Pending, Requested, Failed, Completed };

type Coordinates = {x: number, y: number};

// Given a DOM node, walks up the tree looking for a node of type "td"
// with "sampleX" and "sampleY" values in its dataset.
// If those values are present, return them, otherwise return null.
function findAnEditableCell(node: HTMLElement): Coordinates | null {
  var n = node.nodeName || "";
  n = n.trim().toLowerCase();
  const p = node.parentNode;
  if (n != "td") {
      if (!p) { return null; } else { return findAnEditableCell(p as HTMLElement); }
  } else {
    const x = node.dataset.sampleX;
    const y = node.dataset.sampleY;
    if ((x !== undefined) && (y !== undefined)) {
      return { x: parseInt(x, 10), y: parseInt(y, 10)};
    } else {
      if (!p) { return null; } else { return findAnEditableCell(p as HTMLElement); }
    }
  }
}


const SampleTable: React.FC<SampleTableProps> = (props) => {

  const setId = props.setid;

  const metadataContext = useContext(MetadataContext);
  const [sampleConfigurations, setSampleConfigurations] = useState<SampleConfiguration[]>([]);

  const [tableHasFocus, setTableHasFocus] = useState<boolean>(false);
  const [cellFocusX, setCellFocusX] = useState<number | null>(null);
  const [cellFocusY, setCellFocusY] = useState<number | null>(null);
  const [syncTimer, setSyncTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(SyncState.Idle);


  useEffect(() => {
//    console.log(`sampleTable setId:${setId} changeCounter:${metadataContext.changeCounter} setsLoadingState:${metadataContext.setsLoadingState} scanTypesLoadingState:${metadataContext.scanTypesLoadingState}`);

    if ((setId === undefined) || (!setId.trim())) { return; }

    if (metadataContext.loadingState != MetaDataLoadingState.Succeeded) { return; }

    const thisSet = metadataContext.sets.getById(setId.trim() as Guid);
    if (thisSet === undefined) { return; }

    const sortedSamples = thisSet.all().sort((a, b) => a.mmFromLeftEdge - b.mmFromLeftEdge);
    setSampleConfigurations(sortedSamples);
  }, [setId, metadataContext.changeCounter, metadataContext.loadingState]);


  // Triggered one time only, whenever the input is blurred.
  // Used to ensure the latest state values are being validated (instead of old ones),
  // after a click event on a pulldown item.
  useEffect(() => {
    if (!tableHasFocus) {
//      console.log(`Table lost focus`);
      setCellFocusX(null);
      setCellFocusY(null);
    } else {
//      console.log(`Table got focus`);
    }
  }, [tableHasFocus]);


  function tableOnFocus() {
    setTableHasFocus(true);
  }

  function tableOnBlur() {
    setTableHasFocus(false);
  }


  function tableOnClick(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const foundEditableCell = findAnEditableCell(event.target as HTMLElement);
    var x = null;
    var y = null;
    if (foundEditableCell) {
      x = foundEditableCell.x;
      y = foundEditableCell.y;
    }
    setCellFocusX(x);
    setCellFocusY(y);
  }


  const thisSet = metadataContext.sets.getById(setId!.trim() as Guid)
  if (!thisSet) {
    return (<div></div>)
  }

  const scanTypesAsChoices: ParameterChoice[] =
    metadataContext.scanTypes.typeNamesInDisplayOrder.map((name) => { return { name: name, description: "" }});



  const displayedParameterIds = thisSet.relevantParameters.filter((p) => metadataContext.scanTypes.parametersById.has(p));
  const displayedParameters = displayedParameterIds.map((p) => metadataContext.scanTypes.parametersById.get(p)!);

  // Add the vector to the given currentPosition until it points to a table cell that is
  // valid for editing, then return that position, or return null if we run off the edge of the table.
  function lookForAdjacentCell(currentPosition: Coordinates, vector: Coordinates): Coordinates | null {
    // Sanity check
    if ((vector.x == 0) && (vector.y == 0)) { return null; }
    const nextPosition = { x: currentPosition.x + vector.x, y: currentPosition.y + vector.y };
    const xMax = displayedParameters.length + 4;  // Four additional columns on the left
    const yMax = sampleConfigurations.length;
    if ((nextPosition.x < 0) || (nextPosition.y < 0) || (nextPosition.x >= xMax) || (nextPosition.y >= yMax)) {
      return null;
    }
    // At this point we know the cell we're looking at is within the table.
    if (nextPosition.x < 4) {
      // The first four cells are always editable.
      return nextPosition;
    }
    // The only thing to ask now is whether the cell is for a ScanParameterType that's
    // _actually_used_ by the ScanType set by that row's SampleConfiguration.
    const thisParameter = displayedParameters[nextPosition.x - 4];
    const thisConfig = sampleConfigurations[nextPosition.y];

    const allowedParameters = metadataContext.scanTypes.typesByName.get(thisConfig.scanType)!.parameters;
    if (allowedParameters.some((p) => p == thisParameter.id)) {
      return nextPosition;
    }

    // If it's not one of the parameters used in that ScanType, we need to keep looking.
    return lookForAdjacentCell(nextPosition, vector);
  }


  // Use lookForAdjacentCell to walk along the table from the given cell coordinates,
  // in the given directon, and switch editing to the first editable cell we find.
  function switchEditingToNearbyCell(currentPosition: Coordinates, vector: Coordinates): CellValidationStatus {
    const found = lookForAdjacentCell(currentPosition, vector);
    if (found === null) {
      return CellValidationStatus.Failure;
    }
    setCellFocusX(found.x);
    setCellFocusY(found.y);
    return CellValidationStatus.Success;
  }


  function moveBetweenCells(x: number, y: number, d: CellNavigationDirection): CellValidationStatus {
    var travelVector: Coordinates;
    switch (d) {
      // Seek upward in the table for a nearby editable cell and switch to it if available.
      case CellNavigationDirection.Up:
        travelVector = {x: 0, y: -1};
        break;
      // Seek downward in the table for a nearby editable cell and switch to it if available.
      case CellNavigationDirection.Down:
        travelVector = {x: 0, y: 1};
        break;
      // Seek left in the table for a nearby editable cell and switch to it if available.
      case CellNavigationDirection.Left:
        travelVector = {x: -1, y: 0};
        break;
      // Seek right in the table for a nearby editable cell and switch to it if available.
      case CellNavigationDirection.Right:
        travelVector = {x: 1, y: 0};
        break;
    }
    return switchEditingToNearbyCell({x: x, y: y}, travelVector);
  }


  // A function passed to every SampleTableCell (non-header table cell in samples table)
  // that validates the given input value based on its cell's x,y location in the table.
  // It relies on the displayedParameters constant, calculated just above.
  function cellValidator(x: number, y: number, value: string): CellValidationResult {

    // Validate "mm From Left Edge"
    if (x === 0) {
      const inputNumber = parseFloat(value);
      if (isNaN(inputNumber)) {
        return { status: CellValidationStatus.Failure, message: "Offset must be a number." };
      } else if (sampleConfigurations.some((sample) => sample.mmFromLeftEdge == inputNumber)) {
        return { status: CellValidationStatus.Failure, message: "Location must be unique on bar." };
      }
      return { status: CellValidationStatus.Success, message: null };

    // Validate Name
    } else if (x === 1) {
      if (value == "") {
        return { status: CellValidationStatus.Failure, message: "Name cannot be blank." };
      } else if (sampleConfigurations.some((sample) => sample.name == value)) {
        return { status: CellValidationStatus.Failure, message: "Name must be unique on bar." };
      }
      return { status: CellValidationStatus.Success, message: null };

    // Validate Description
    } else if (x === 2) {
      // Description can be anything
      return { status: CellValidationStatus.Success, message: null };

    // Validate Scan Type
    } else if (x === 3) {
      if (metadataContext.scanTypes.typeNamesInDisplayOrder.some((name) => name == value)) {
        return { status: CellValidationStatus.Success, message: null };
      }
      return { status: CellValidationStatus.Failure, message: "Must be the name of a Scan Type." };

    // Validate scan parameters
    } else if ((x > 3) && ((x-4) < displayedParameters.length)) {

      const paramType = displayedParameters[x - 4];
      if (paramType.validator !== undefined) {
        const result = paramType.validator(value);
        if (result !== null) {
          return { status: CellValidationStatus.Failure, message: result };
        }
      }
      // If no validator exists, or the validator returned null, the value is good.
      return { status: CellValidationStatus.Success, message: null };
    }
    return { status: CellValidationStatus.Failure, message: "Error: Cannot find this parameter!" };
  }


  // A function passed to every SampleTableCell (non-header table cell in samples table)
  // that saves the given input value to the SampleConfiguration indicated by the
  // table cell at the given x,y location.
  // It relies on the displayedParameters constant, calculated just above.
  function cellSave(x: number, y: number, newValue: string): CellValidationResult {

    const thisConfig = sampleConfigurations[y];
    if (!thisConfig) {
      return { status: CellValidationStatus.Failure, message: "Error: SampleConfiguration does not exist!" }
    }

    var editedConfig = thisConfig.clone();

    // "mm From Left Edge"
    if (x === 0) {
      editedConfig.mmFromLeftEdge = parseFloat(newValue);

    // Name
    } else if (x === 1) {
      editedConfig.name = newValue;

    // Description
    } else if (x === 2) {
      editedConfig.description = newValue;

    // Scan Type
    } else if (x === 3) {
      const asScanTypeName = newValue as ScanTypeName;
      editedConfig.scanType = asScanTypeName;
      const newScanType = metadataContext.scanTypes.typesByName.get(asScanTypeName);
      newScanType!.parameters.forEach((p) => {
        const parameterType = metadataContext.scanTypes.parametersById.get(p);
        if (parameterType) {
          // Set any missing parameters to defaults.
          if (!editedConfig.parameters.has(parameterType!.id)) {
            editedConfig.parameters.set(parameterType.id, parameterType.default ?? "");
          }
        }
      });

    // Validate scan parameters
    } else if ((x > 3) && ((x-4) < displayedParameters.length)) {
      const paramType = displayedParameters[x - 4];
      editedConfig.parameters.set(paramType.id, newValue);
    }

    thisSet!.addOrReplaceWithHistory([editedConfig]);
    contentChanged();

    // This may not be the right behavior
    sampleConfigurations[y] = editedConfig;

    return { status: CellValidationStatus.Success, message: null };
  }


  // At this point we've defined all the functions we need to pass
  // to each editable cell in the table.
  const cellFunctions: CellFunctions = {
    validate: cellValidator,
    save: cellSave,
    move: moveBetweenCells
  }


  function contentChanged() {
    if (syncTimer) { clearTimeout(syncTimer); }
    setSyncTimer(setTimeout(() => syncTimerExpired(), 1000));
    if (syncState != SyncState.Requested) {
      setSyncState(SyncState.Pending);
    }
  }


  async function syncTimerExpired() {
    // If another save is pending while the previous one is still
    // in progress, we renew the timer and exit, until the previous
    // one reports either Completed or Failed.
    if (syncState == SyncState.Requested) {
      setSyncTimer(setTimeout(() => syncTimerExpired(), 1000));
      return;
    }

    setSyncTimer(null);
    const edits = thisSet!.getPendingEdits();
    if (!edits) {
      setSyncState(SyncState.Idle);
      return;
    }

    setSyncState(SyncState.Requested);

    const saveCalls = edits.edit.additions.map((e) => updateConfig(e as SampleConfiguration));
    const deleteCalls = edits.edit.deletions.map((e) => {
      const c = e as SampleConfiguration;
      c.isValid = false;
      return updateConfig(c as SampleConfiguration)
    });

    Promise.all(saveCalls.concat(deleteCalls)).then((responses) => {
      if (responses.every((r) => r.success)) {
        setSyncState(SyncState.Completed);
        thisSet!.catchUpToEdit(edits.index);
      } else {
        setSyncState(SyncState.Failed);
      }
    });
  }


  var tableHeaders = [
      (<th key="mm" scope="col">From Left Edge</th>),
      (<th key="name" scope="col">Name</th>),
      (<th key="description" scope="col">Description</th>),
      (<th key="scantype" scope="col">Scan Type</th>)
  ];

  displayedParameters.forEach((p) => {
    tableHeaders.push((<th key={p.id} scope="col">{ p.name }</th>));
  });


  var syncStatusIcon: JSX.Element | null = null;
  if (syncState == SyncState.Requested) {
    syncStatusIcon = (<FontAwesomeIcon icon={faSpinner} spin={true} />); 
  } else if (syncState == SyncState.Completed) {
    syncStatusIcon = (<FontAwesomeIcon icon={faCheck} />);
  } else if (syncState == SyncState.Failed) {
    syncStatusIcon = (<FontAwesomeIcon icon={faExclamationTriangle} color="darkred" />);
  }

  return (
    <>

      <nav className="level">
        <div className="level-left">
          <div className="level-item">
            <p className="subtitle is-5"><strong>{ sampleConfigurations.length }</strong> samples</p>
          </div>
        </div>

        <div className="level-right">
          <div className="level-item">
            <ImportSamples />
          </div>
          <div className="level-item">
            <AddSamples />
          </div>
          <div className="level-item">
              <span className="icon">
                { syncStatusIcon }
              </span>
          </div>
        </div>
      </nav>

      <div className="block">
        { sampleConfigurations.length == 0 ? (
          <p>( Use the buttons on the right to add Samples. )</p>
        ) : (
          <table className="sampletable"
                  tabIndex={0}
                  onFocus={ tableOnFocus }
                  onBlur={ tableOnBlur }
                  onClick={ tableOnClick }
              >
            <thead>
              <tr key="headers">
                { tableHeaders }
              </tr>
            </thead>
            <tbody>
              {
                sampleConfigurations.map((sample, sampleIndex) => {
                  var cells: JSX.Element[] = [];

                  const cellFocusOnThisY = (cellFocusY === sampleIndex);
                  const allowedParameters = new Set(metadataContext.scanTypes.typesByName.get(sample.scanType)!.parameters);

                  displayedParameters.forEach((p, paramIndex) => {
                    const unused = !allowedParameters.has(p.id);
                    const activated = (cellFocusX === (paramIndex+4)) && cellFocusOnThisY;
                    const cellClass = "samplecell " + (unused ? "unused" : "");
                    const td = (
                      <td key={ p.id }
                          data-sample-x={paramIndex+4}
                          data-sample-y={sampleIndex}
                          data-sample-unused={unused || 0}
                          className={ cellClass }
                        >
                        <SampleTableCell x={paramIndex+4} y={sampleIndex}
                                    key={ p.id }
                                    cellKey={ p.id }
                                    isUnused={unused}
                                    isActivated={activated}
                                    cellFunctions={cellFunctions}
                                    description={ p.description }
                                    value={ sample.parameters.get(p.id) ?? "" }
                                    choices={ p.choices }
                            />
                      </td>);
                    cells.push(td);
                  });

                  return (
                    <tr key={sample["id"]}>
                      <td key="mm"
                          data-sample-x={0}
                          data-sample-y={sampleIndex}
                          data-sample-unused={0}
                          className="samplecell"
                        >
                        <SampleTableCell x={0} y={sampleIndex}
                            key="mm"
                            cellKey="mm"
                            isActivated={(cellFocusX === 0) && cellFocusOnThisY}
                            cellFunctions={cellFunctions}
                            value={ sample.mmFromLeftEdge.toString() } />
                      </td>
                      <td key="name"
                          data-sample-x={1}
                          data-sample-y={sampleIndex}
                          data-sample-unused={0}
                          className="samplecell"
                        >
                        <SampleTableCell x={1} y={sampleIndex}
                            key="name"
                            cellKey="name"
                            isActivated={(cellFocusX === 1) && cellFocusOnThisY}
                            cellFunctions={cellFunctions}
                            value={ sample.name } />
                      </td>
                      <td key="description"
                          data-sample-x={2}
                          data-sample-y={sampleIndex}
                          data-sample-unused={0}
                          className="samplecell"
                        >
                        <SampleTableCell x={2} y={sampleIndex}
                            key="description"
                            cellKey="description"
                            isActivated={(cellFocusX === 2) && cellFocusOnThisY}
                            cellFunctions={cellFunctions}
                            value={ sample.description } />
                      </td>
                      <td key="scantype"
                          data-sample-x={3}
                          data-sample-y={sampleIndex}
                          data-sample-unused={0}
                          className="samplecell"
                        >
                        <SampleTableCell x={3} y={sampleIndex}
                            key="scantype"
                            cellKey="scantype"
                            isActivated={(cellFocusX === 3) && cellFocusOnThisY}
                            cellFunctions={cellFunctions}
                            value={ sample.scanType }
                            choices={ scanTypesAsChoices } />
                      </td>
                      { cells }
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

export default SampleTable
