import React, { useState, useEffect, useContext } from 'react';
import 'bulma/css/bulma.min.css';

import { Guid } from '../../components/utils.tsx';
import { SampleConfiguration } from '../../sampleConfiguration.ts';
import { SampleConfigurationContext, ProviderLoadingState } from '../../sampleConfigurationProvider.tsx';
import AddSamples from './addSamples.tsx';
import ImportSamples from './importSamples.tsx';
import { SampleCell, CellFunctions, CellValidationStatus, CellValidationResult } from './sampleCell.tsx';
import './sampleTable.css';


interface SampleTableProps {
  setid: Guid;
}

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

  const configContext = useContext(SampleConfigurationContext);
  const [sampleConfigurations, setSampleConfigurations] = useState<SampleConfiguration[]>([]);

  const [tableHasFocus, setTableHasFocus] = useState<boolean>(false);
  const [cellFocusX, setCellFocusX] = useState<number | null>(null);
  const [cellFocusY, setCellFocusY] = useState<number | null>(null);


  useEffect(() => {
    console.log(`sampleTable setId:${setId} changeCounter:${configContext.changeCounter} setsLoadingState:${configContext.setsLoadingState} scanTypesLoadingState:${configContext.scanTypesLoadingState}`);

    if ((setId === undefined) || (!setId.trim())) { return; }

    if (configContext.loadingState != ProviderLoadingState.Succeeded) { return; }

    const thisSet = configContext.sets.getById(setId.trim() as Guid);
    if (thisSet === undefined) { return; }

    const sortedSamples = thisSet.all().sort((a, b) => a.mmFromLeftEdge - b.mmFromLeftEdge);
    setSampleConfigurations(sortedSamples);
  }, [setId, configContext.changeCounter, configContext.loadingState]);


  // Triggered one time only, whenever the input is blurred.
  // Used to ensure the latest state values are being validated (instead of old ones),
  // after a click event on a pulldown item.
  useEffect(() => {
    if (!tableHasFocus) {
      console.log(`Table lost focus`);
      setCellFocusX(null);
      setCellFocusY(null);
    } else {
      console.log(`Table got focus`);
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
    if (!foundEditableCell) {
      setCellFocusX(null);
      setCellFocusY(null);
      return;
    }
    setCellFocusX(foundEditableCell.x);
    setCellFocusY(foundEditableCell.y);
    console.log(foundEditableCell);
  }


  const set = configContext.sets.getById(setId!.trim() as Guid)
  if (!set) {
    return (<div></div>)
  }

  const displayedParameterIds = set.relevantParameters.filter((p) => configContext.scanTypes.parametersById.has(p));
  const displayedParameters = displayedParameterIds.map((p) => configContext.scanTypes.parametersById.get(p)!);

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

    const allowedParameters = configContext.scanTypes.typesByName.get(thisConfig.scanType)!.parameters;
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


  // Seek upward in the table for a nearby editable cell and switch to it if available.
  function goUp(x: number, y: number): CellValidationStatus {
    const travelVector: Coordinates = {x: 0, y: -1};
    return switchEditingToNearbyCell({x: x, y: y}, travelVector);
  }


  // Seek downward in the table for a nearby editable cell and switch to it if available.
  function goDown(x: number, y: number): CellValidationStatus {
    const travelVector: Coordinates = {x: 0, y: 1};
    return switchEditingToNearbyCell({x: x, y: y}, travelVector);
  }


  // Seek left in the table for a nearby editable cell and switch to it if available.
  function goLeft(x: number, y: number): CellValidationStatus {
    const travelVector: Coordinates = {x: -1, y: 0};
    return switchEditingToNearbyCell({x: x, y: y}, travelVector);
  }


  // Seek right in the table for a nearby editable cell and switch to it if available.
  function goRight(x: number, y: number): CellValidationStatus {
    const travelVector: Coordinates = {x: 1, y: 0};
    return switchEditingToNearbyCell({x: x, y: y}, travelVector);
  }


  // A function passed to every SampleCell (non-header table cell in samples table)
  // that validates the given input value based on its cell's x,y location in the table.
  // It relies on the displayedParameters constant, calculated just above.
  function cellValidator(x: number, y: number, inputString: string): CellValidationResult {

    // Validate "mm From Left Edge"
    if (x === 0) {
      const inputNumber = parseFloat(inputString);
      if (isNaN(inputNumber)) {
        return { status: CellValidationStatus.Failure, message: "Offset must be a number." };
      } else if (sampleConfigurations.some((sample) => sample.mmFromLeftEdge == inputNumber)) {
        return { status: CellValidationStatus.Failure, message: "Location must be unique on bar." };
      }
      return { status: CellValidationStatus.Success, message: null };

    // Validate Name
    } else if (x === 1) {
      if (inputString == "") {
        return { status: CellValidationStatus.Failure, message: "Name cannot be blank." };
      } else if (sampleConfigurations.some((sample) => sample.name == inputString)) {
        return { status: CellValidationStatus.Failure, message: "Name must be unique on bar." };
      }
      return { status: CellValidationStatus.Success, message: null };

    // Validate Description
    } else if (x === 2) {
      // Description can be anything
      return { status: CellValidationStatus.Success, message: null };

    // Validate scan parameters
    } else if ((x > 3) && ((x-4) < displayedParameters.length)) {

      const paramType = displayedParameters[x - 4];
      if (paramType.validator !== undefined) {
        const result = paramType.validator(inputString);
        if (result !== null) {
          return { status: CellValidationStatus.Failure, message: result };
        }
      }
      // If no validator exists, or the validator returned null, the value is good.
      return { status: CellValidationStatus.Success, message: null };
    }
    return { status: CellValidationStatus.Failure, message: "Error: Cannot find this parameter!" };
  }


  // A function passed to every SampleCell (non-header table cell in samples table)
  // that saves the given input value to the SampleConfiguration indicated by the
  // table cell at the given x,y location.
  // It relies on the displayedParameters constant, calculated just above.
  function cellSave(x: number, y: number, inputString: string): CellValidationResult {

    const thisConfig = sampleConfigurations[y];
    if (!thisConfig) {
      return { status: CellValidationStatus.Failure, message: "Error: SampleConfiguration does not exist!" }
    }

    var editedConfig = thisConfig.clone();

    // "mm From Left Edge"
    if (x === 0) {
      editedConfig.mmFromLeftEdge = parseFloat(inputString);

    // Name
    } else if (x === 1) {
      editedConfig.name = inputString;

    // Description
    } else if (x === 2) {
      editedConfig.description = inputString;

    // Validate scan parameters
    } else if ((x > 3) && ((x-4) < displayedParameters.length)) {
      const paramType = displayedParameters[x - 4];
      editedConfig.parameters.set(paramType.id, inputString);
    }

    const thisSet = configContext.sets.getById(setId!.trim() as Guid)!;
    thisSet.addOrReplaceWithHistory([editedConfig]);

    // This may not be the right behavior
    sampleConfigurations[y] = editedConfig;

    return { status: CellValidationStatus.Success, message: null };
  }


  const cellFunctions: CellFunctions = {
    validator: cellValidator,
    save: cellSave,
    up: goUp,
    down: goDown,
    left: goLeft,
    right: goRight
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
                  const allowedParameters = new Set(configContext.scanTypes.typesByName.get(sample.scanType)!.parameters);

                  displayedParameters.forEach((p, paramIndex) => {
                    const unused = !allowedParameters.has(p.id);
                    const activated = (cellFocusX === (paramIndex+4)) && cellFocusOnThisY;
                    const td = (<SampleCell x={paramIndex+4} y={sampleIndex}
                                  key={ p.id }
                                  cellKey={ p.id }
                                  isUnused={unused}
                                  isActivated={activated}
                                  cellFunctions={cellFunctions}
                                  description={ p.description }
                                  value={ sample.parameters.get(p.id) ?? "" } />) ;
                    cells.push(td);
                  });

                  return (
                    <tr key={sample["id"]}>
                      <SampleCell x={0} y={sampleIndex}
                          key="mm"
                          cellKey="mm"
                          isActivated={(cellFocusX === 0) && cellFocusOnThisY}
                          cellFunctions={cellFunctions}
                          value={ sample.mmFromLeftEdge.toString() } />
                      <SampleCell x={1} y={sampleIndex}
                          key="name"
                          cellKey="name"
                          isActivated={(cellFocusX === 1) && cellFocusOnThisY}
                          cellFunctions={cellFunctions}
                          value={ sample.name } />
                      <SampleCell x={2} y={sampleIndex}
                          key="description"
                          cellKey="description"
                          isActivated={(cellFocusX === 2) && cellFocusOnThisY}
                          cellFunctions={cellFunctions}
                          value={ sample.description } />
                      <SampleCell x={3} y={sampleIndex}
                          key="scantype"
                          cellKey="scantype"
                          isActivated={(cellFocusX === 3) && cellFocusOnThisY}
                          cellFunctions={cellFunctions}
                          value={ sample.scanType } />
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
