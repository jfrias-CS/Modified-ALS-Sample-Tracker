import React, { useState, useEffect, useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faSpinner, faCheck, faUndo, faRedo } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import { Guid, truthyJoin, sortWithNumberParsing } from '../../components/utils.tsx';
import { ScanTypeName, ParamUid, ScanParameterSettings, ParameterChoice } from '../../scanTypes.ts';
import { SampleConfiguration } from '../../sampleConfiguration.ts';
import { MetadataContext, MetaDataLoadingState } from '../../metadataProvider.tsx';
import { updateConfig } from '../../metadataApi.ts';
import AddSamples from './addSamples.tsx';
import ImportSamples from './importSamples.tsx';
import { SampleTableCell } from './sampleTableCell/cell.tsx';
import { CellFunctions, CellActivationStatus, CellValidationStatus, CellValidationResult, CellNavigationDirection } from './sampleTableCell/cellDto.ts';
import { SampleTableClipboardContent } from './sampleClipboard.ts';
import './sampleTable.css';


interface SampleTableProps {
  setid: Guid;
}

enum SyncState { Idle, Pending, Requested, Failed, Completed };

type Coordinates = {x: number, y: number};

// It's a magic number I know, and that's annoying, but this is the number of
// standard non-parameter fields that are always displayed on the left side of the table.
const FIXED_COLUMN_COUNT = 3;


// Given a DOM node, walks up the tree looking for a node of type "td"
// with "sampleX" and "sampleY" values in its dataset.
// If those values are present, return them, otherwise return null.
function findAnEditableCell(node: HTMLElement): Coordinates | null {
  var n = node.nodeName || "";
  n = n.trim().toLowerCase();
  if (n == "td") {
    const x = node.dataset.sampleX;
    const y = node.dataset.sampleY;
    if ((x !== undefined) && (y !== undefined)) {
      return { x: parseInt(x, 10), y: parseInt(y, 10)};
    }
  }
  const p = node.parentNode;
  if (!p) { return null; } else { return findAnEditableCell(p as HTMLElement); }
}


const SampleTable: React.FC<SampleTableProps> = (props) => {

  const setId = props.setid;

  const metadataContext = useContext(MetadataContext);
  const [sampleConfigurations, setSampleConfigurations] = useState<SampleConfiguration[]>([]);

  const [tableHasFocus, setTableHasFocus] = useState<boolean>(false);
  const [cellFocusX, setCellFocusX] = useState<number | null>(null);
  const [cellFocusY, setCellFocusY] = useState<number | null>(null);
  const [lastActivationMethod, setLastActivationMethod] = useState<CellActivationStatus>(CellActivationStatus.Inactive);

  const [cellMouseDown, setCellMouseDown] = useState<boolean>(false);
  const [cellMouseDownX, setCellMouseDownX] = useState<number | null>(null);
  const [cellMouseDownY, setCellMouseDownY] = useState<number | null>(null);
  const [cellMouseMoveX, setCellMouseMoveX] = useState<number | null>(null);
  const [cellMouseMoveY, setCellMouseMoveY] = useState<number | null>(null);

  const [syncTimer, setSyncTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(SyncState.Idle);


  useEffect(() => {
    if ((setId === undefined) || (!setId.trim())) { return; }

    if (metadataContext.loadingState != MetaDataLoadingState.Succeeded) { return; }

    const thisSet = metadataContext.sets.getById(setId.trim() as Guid);
    if (thisSet === undefined) { return; }

    const sortedSamples = thisSet.all().sort((a, b) => { return sortWithNumberParsing(a.name, b.name)});
    setSampleConfigurations(sortedSamples);
  }, [setId, metadataContext.changeCounter, metadataContext.loadingState]);


  // Triggered one time only, whenever the input is blurred.
  // Used to ensure the latest state values are being validated (instead of old ones),
  // after a click event on a pulldown item.
  useEffect(() => {
    if (!tableHasFocus) {
      setCellFocusX(null);
      setCellFocusY(null);
    }
  }, [tableHasFocus]);


  function tableOnFocus() {
    setTableHasFocus(true);
  }

  function tableOnBlur() {
    setTableHasFocus(false);
  }


  function tableOnMouseDown(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const foundCell = findAnEditableCell(event.target as HTMLElement);
    if (foundCell) {
      setCellMouseDown(true);
      setCellMouseDownX(foundCell.x);
      setCellMouseDownY(foundCell.y);
      setCellMouseMoveX(foundCell.x);
      setCellMouseMoveY(foundCell.y);
      if ((cellFocusX != foundCell.x) || (cellFocusY != foundCell.y)) {
        setCellFocusX(null);
        setCellFocusY(null);
      }
      // We can't do this because it creates a reference to the function in a previous
      // iteration of the SampleTable react object, which contains the old useState values.
      // document.addEventListener("mouseup", tableOnMouseUp, {once: true});
    } else {
      setCellMouseDown(false);
      setCellMouseDownX(null);
      setCellMouseDownY(null);
      setCellMouseMoveX(null);
      setCellMouseMoveY(null);
    }
  }


  function tableOnMouseOver(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    // We do no tracking if the mouse isn't down
    if (!cellMouseDown) { return; }
    const foundCell = findAnEditableCell(event.target as HTMLElement);
    if (!foundCell) {
      return;
    }
    if ((foundCell.x != cellMouseMoveX) || (foundCell.y != cellMouseMoveY)) {
      setCellMouseMoveX(foundCell.x);
      setCellMouseMoveY(foundCell.y);
    }
  }


  function tableOnMouseUp(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    setCellMouseDown(false);
    // It doesn't matter where the mouse came up,
    // we go by the last valid cell the mouse was moved in.
    if ((cellMouseDownX == cellMouseMoveX) && (cellMouseDownY == cellMouseMoveY)) {
      setLastActivationMethod(CellActivationStatus.ByMouse);
      setCellFocusX(cellMouseDownX);
      setCellFocusY(cellMouseDownY);
    } else {
      setCellFocusX(null);
      setCellFocusY(null);
    }
  }


  function isWithinSelection(x: number, y: number) {
    if ((cellMouseDownX !== null) && (cellMouseDownY !== null) &&
        (cellMouseMoveX !== null) && (cellMouseMoveY !== null)) {
      if ((x <= Math.max(cellMouseDownX, cellMouseMoveX)) && 
          (x >= Math.min(cellMouseDownX, cellMouseMoveX))) { 
        if ((y <= Math.max(cellMouseDownY, cellMouseMoveY)) && 
            (y >= Math.min(cellMouseDownY, cellMouseMoveY))) { 
          return true;
        }
      }
    }
    return false;
  }


  function selectionBorderClasses(x: number, y: number) {
    // If the table doesn't have focus, don't show the selection to avoid confusion
    // over what else might be selected for copy/paste on the page.
    if (!tableHasFocus) { return []; }
    // If there is a cell in focus for editing, we don't draw the selection border.
    if ((cellFocusX !== null) && (cellFocusY !== null)) {
      return [];
    }
    var borderClasses = [];
    // If one is true and the other false, regardless of which one, we're on either side of a transition
    // between "selected" and "not selected", and should set a border style.
    // When adding borders to table cells, the cells on both sides of the given border need to agree.
    if (isWithinSelection(x, y) != isWithinSelection(x, y-1)) {
      borderClasses.push("selectionTop");
    }
    if (isWithinSelection(x, y) != isWithinSelection(x, y+1)) {
      borderClasses.push("selectionBottom");
    }
    if (isWithinSelection(x, y) != isWithinSelection(x-1, y)) {
      borderClasses.push("selectionLeft");
    }
    if (isWithinSelection(x, y) != isWithinSelection(x+1, y)) {
      borderClasses.push("selectionRight");
    }
    if (isWithinSelection(x, y)) {
      borderClasses.push("inSelection");
    }
    return borderClasses;
  }


  const thisSet = metadataContext.sets.getById(setId!.trim() as Guid)
  if (!thisSet) {
    return (<div></div>)
  }

  // For the standard "scan type" column, which users the autocomplete widget
  const scanTypesAsChoices: ParameterChoice[] =
    metadataContext.scanTypes.typeNamesInDisplayOrder.map((name) => { return { name: name, description: "" }});


  const displayedParameterIds = thisSet.relevantParameters.filter((p) => metadataContext.scanTypes.parametersById.has(p));
  const displayedParameters = displayedParameterIds.map((p) => metadataContext.scanTypes.parametersById.get(p)!);


  function tableOnCopy(event: React.ClipboardEvent) {
    // If it's an element within the table, don't intercept the event.
    // We're only interested in copy events where the table element itself has focus.
    if (!tableHasFocus) { return; }
    // A cell is being edited directly
    if ((cellFocusY !== null) || (cellFocusX !== null)) { return; }
    // No rows selected
    if ((cellMouseDownY === null) || (cellMouseMoveY === null)) { return; }
    // No columns selected
    if ((cellMouseDownX === null) || (cellMouseMoveX === null)) { return; }
    const c:SampleTableClipboardContent = new SampleTableClipboardContent();

    var sampleRows = [];
    for (var y = Math.min(cellMouseDownY, cellMouseMoveY); y <= Math.max(cellMouseDownY, cellMouseMoveY); y++) {
      sampleRows.push(sampleConfigurations[y]);
    }

    // The first FIXED_COLUMN_COUNT columns of the table always represent these fields in order:
    const fields = ["name", "description", "scanType"];
    var selectedFields = [];
    // If the selection overlaps those columns, we push the relevant field names. 
    var lowX = Math.min(cellMouseDownX, cellMouseMoveX);
    const highX = Math.max(cellMouseDownX, cellMouseMoveX);
    while (lowX < Math.min(highX, FIXED_COLUMN_COUNT)) {
      selectedFields.push(fields[lowX]);
      lowX++;
    }

    var selectedParameters = [];
    // If the selection overlaps those columns, we push the relevant field names. 
    var lowX = Math.max(Math.min(cellMouseDownX, cellMouseMoveX), FIXED_COLUMN_COUNT);
    while (lowX <= highX) {
      selectedParameters.push(displayedParameterIds[lowX-FIXED_COLUMN_COUNT]);
      lowX++;
    }

    c.fromTable(sampleRows, selectedFields, selectedParameters);
    c.sendToClipboard(event);
  }


  function tableOnPaste(event: React.ClipboardEvent) {
    // If it's an element within the table, don't intercept the event.
    // We're only interested in copy events where the table element itself has focus.
    if (!tableHasFocus) { return; }
    // A cell is being edited directly
    if ((cellFocusY !== null) || (cellFocusX !== null)) { return; }
    // No rows selected
    if ((cellMouseDownY === null) || (cellMouseMoveY === null)) { return; }
    // No columns selected
    if ((cellMouseDownX === null) || (cellMouseMoveX === null)) { return; }
    const c:SampleTableClipboardContent = new SampleTableClipboardContent();

    c.fromClipboardPasteEvent(event);
    // If we didn't get any content, give up
    const validRawText = c.alternateTextData !== null ? true : false;
    if ((c.content.length == 0) && !validRawText) { return; }

    // Is there only one sample on the clipboard to work with?
    // This will influence our pasting behavior.
    const oneSample = c.content.length == 1 ? true : false;
    // Was there only one field/parameter column selected when the data was copied?
    // Are there none selected, as we would get from a paste of raw text?
    // This also will influence out pasting behavior.
    const oneColumn = (c.selectedFields.size + c.selectedParameters.size) == 1 ? true : false;
    const zeroColumns = (c.selectedFields.size + c.selectedParameters.size) == 0 ? true : false;

    // The rect of the current selection.  We may re-form this in the process of pasting.
    var upperLeftX = Math.min(cellMouseDownX, cellMouseMoveX);
    var upperLeftY = Math.min(cellMouseDownY, cellMouseMoveY);
    var lowerRightX = Math.max(cellMouseDownX, cellMouseMoveX);
    var lowerRightY = Math.max(cellMouseDownY, cellMouseMoveY);

    // Possible different behavior if just one column is selected
    const pastingToOneColumn = lowerRightX == upperLeftX ? true : false;

    console.log(`zeroColumns: ${zeroColumns}`);

    // If we're bulk-pasting raw text to a single column that isn't "name":
    if (zeroColumns && pastingToOneColumn && validRawText && (upperLeftX > 0)) {

      var editedConfigs = [];
      var y = 0;
      while (upperLeftY+y <= lowerRightY) {

        var editedConfig = sampleConfigurations[upperLeftY+y].clone();

        // Description
        if (upperLeftX === 1) {
          editedConfig.description = c.alternateTextData!;

        // Scan Type
        } else if (upperLeftX === 2) {
          const asScanTypeName = c.alternateTextData! as ScanTypeName;
          editedConfig.scanType = asScanTypeName;
          const newScanType = metadataContext.scanTypes.typesByName.get(asScanTypeName);
          newScanType!.parameters.forEach((p) => {
            const parameterType = metadataContext.scanTypes.parametersById.get(p.typeId);
            if (parameterType) {
              // Set any missing parameters to defaults.
              if (!editedConfig.parameters.has(parameterType!.id)) {
                editedConfig.parameters.set(parameterType.id, parameterType.default ?? "");
              }
            }
          });

        // Validate scan parameters
        } else if ((upperLeftX >= FIXED_COLUMN_COUNT) && ((upperLeftX-FIXED_COLUMN_COUNT) < displayedParameters.length)) {
          const paramType = displayedParameters[upperLeftX - FIXED_COLUMN_COUNT];
          editedConfig.parameters.set(paramType.id, c.alternateTextData!);
        }

        editedConfigs.push(editedConfig);

        // This may not be the right behavior
        sampleConfigurations[upperLeftY+y] = editedConfig;
        y++;
      }

      thisSet!.addOrReplaceWithHistory(editedConfigs);
      contentChanged();
    }
  }


  // Add the vector to the given currentPosition until it points to a table cell that is
  // valid for editing, then return that position, or return null if we run off the edge of the table.
  function lookForAdjacentCell(currentPosition: Coordinates, vector: Coordinates): Coordinates | null {
    // Sanity check
    if ((vector.x == 0) && (vector.y == 0)) { return null; }
    const nextPosition = { x: currentPosition.x + vector.x, y: currentPosition.y + vector.y };
    const xMax = displayedParameters.length + FIXED_COLUMN_COUNT;  // Standard field columns on the left
    const yMax = sampleConfigurations.length;
    if ((nextPosition.x < 0) || (nextPosition.y < 0) || (nextPosition.x >= xMax) || (nextPosition.y >= yMax)) {
      return null;
    }
    // At this point we know the cell we're looking at is within the table.
    if (nextPosition.x < FIXED_COLUMN_COUNT) {
      // The field cells are assumed to be always editable.
      return nextPosition;
    }
    // The only thing to ask now is whether the cell is for a ScanParameterType that's
    // _actually_used_ by the ScanType set by that row's SampleConfiguration.
    const thisParameter = displayedParameters[nextPosition.x - FIXED_COLUMN_COUNT];
    const thisConfig = sampleConfigurations[nextPosition.y];

    const allowedParameters = metadataContext.scanTypes.typesByName.get(thisConfig.scanType)!.parameters;
    if (allowedParameters.some((p) => p.typeId == thisParameter.id)) {
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
    const result = switchEditingToNearbyCell({x: x, y: y}, travelVector);
    if (result == CellValidationStatus.Success) {
        setLastActivationMethod(CellActivationStatus.ByKeyboard);
    }
    return result;
  }


  // A function passed to every SampleTableCell (non-header table cell in samples table)
  // that validates the given input value based on its cell's x,y location in the table.
  // It relies on the displayedParameters constant, calculated just above.
  function cellValidator(x: number, y: number, value: string): CellValidationResult {

    // Validate Name
    if (x === 0) {
      if (value == "") {
        return { status: CellValidationStatus.Failure, message: "Name cannot be blank." };
      } else if (sampleConfigurations.some((sample) => sample.name == value)) {
        return { status: CellValidationStatus.Failure, message: "Name must be unique on bar." };
      }
      return { status: CellValidationStatus.Success, message: null };

    // Validate Description
    } else if (x === 1) {
      // Description can be anything
      return { status: CellValidationStatus.Success, message: null };

    // Validate Scan Type
    } else if (x === 2) {
      if (metadataContext.scanTypes.typeNamesInDisplayOrder.some((name) => name == value)) {
        return { status: CellValidationStatus.Success, message: null };
      }
      return { status: CellValidationStatus.Failure, message: "Must be the name of a Scan Type." };

    // Validate scan parameters
    } else if ((x >= FIXED_COLUMN_COUNT) && ((x-FIXED_COLUMN_COUNT) < displayedParameters.length)) {

      const paramType = displayedParameters[x - FIXED_COLUMN_COUNT];
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

    // Name
    if (x === 0) {
      editedConfig.name = newValue;

    // Description
    } else if (x === 1) {
      editedConfig.description = newValue;

    // Scan Type
    } else if (x === 2) {
      const asScanTypeName = newValue as ScanTypeName;
      editedConfig.scanType = asScanTypeName;
      const newScanType = metadataContext.scanTypes.typesByName.get(asScanTypeName);
      newScanType!.parameters.forEach((p) => {
        const parameterType = metadataContext.scanTypes.parametersById.get(p.typeId);
        if (parameterType) {
          // Set any missing parameters to defaults.
          if (!editedConfig.parameters.has(parameterType!.id)) {
            editedConfig.parameters.set(parameterType.id, parameterType.default ?? "");
          }
        }
      });

    // Validate scan parameters
    } else if ((x >= FIXED_COLUMN_COUNT) && ((x-FIXED_COLUMN_COUNT) < displayedParameters.length)) {
      const paramType = displayedParameters[x - FIXED_COLUMN_COUNT];
      editedConfig.parameters.set(paramType.id, newValue);
    }

    thisSet!.addOrReplaceWithHistory([editedConfig]);
    contentChanged();

    // This may not be the right behavior
    sampleConfigurations[y] = editedConfig;

    return { status: CellValidationStatus.Success, message: null };
  }


  function clickedUndo() {
    thisSet!.undo();
    metadataContext.changed();
    contentChanged();
  }


  function clickedRedo() {
    thisSet!.redo();
    metadataContext.changed();
    contentChanged();
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
    setSyncTimer(setTimeout(() => syncTimerExpired(), 1500));
    if (syncState != SyncState.Requested) {
      setSyncState(SyncState.Pending);
    }
  }


  async function syncTimerExpired() {
    // If another save is pending while the previous one is still
    // in progress (requested), we renew the timer and exit, until the previous
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
      (<th key="name" scope="col">Name</th>),
      (<th key="description" scope="col">Description</th>),
      (<th key="scantype" scope="col">Scan Type</th>)
  ];

  displayedParameters.forEach((p) => {
    tableHeaders.push((<th key={p.id} scope="col">{ p.name }</th>));
  });


  var syncStatusMessag: JSX.Element | null = null;
  if (syncState == SyncState.Requested) {
    syncStatusMessag = (<div><FontAwesomeIcon icon={faSpinner} spin={true} /> Saving Changes</div>); 
  } else if (syncState == SyncState.Completed) {
    syncStatusMessag = (<div><FontAwesomeIcon icon={faCheck} /> Changes Saved</div>);
  } else if (syncState == SyncState.Failed) {
    syncStatusMessag = (<div><FontAwesomeIcon icon={faExclamationTriangle} color="darkred" /> Error Saving! Are you logged in?</div>);
  }

  const allowSampleImport = false;

  return (
    <>

      <nav className="level">
        <div className="level-left">
          <div className="level-item">
            <p className="subtitle is-5"><strong>{ sampleConfigurations.length }</strong> samples</p>
          </div>
          { allowSampleImport && (
            <div className="level-item">
              <ImportSamples />
            </div>)
          }
          <div className="level-item">
            <AddSamples />
          </div>

        </div>
        <div className="level-right">

          <div className="level-item">
              { syncStatusMessag }
          </div>

          <div className="level-item">
            <div className="field has-addons">
              <p className="control">
                <button className="button" onClick={ clickedUndo } title="Undo" disabled={!thisSet!.canUndo()}>
                  <FontAwesomeIcon icon={faUndo} />
                </button>
              </p>
              <p className="control">
                <button className="button" onClick={ clickedRedo } title="Redo" disabled={!thisSet!.canRedo()}>
                  <FontAwesomeIcon icon={faRedo} />
                </button>
              </p>
            </div>
          </div>

        </div>
      </nav>

      <div className="block">
        { sampleConfigurations.length == 0 ? (
          <p>( Use the "Add Samples" button to get started. )</p>
        ) : (
          <table className="sampletable"
                  tabIndex={0}
                  onFocus={ tableOnFocus }
                  onBlur={ tableOnBlur }
                  onCopy={ tableOnCopy }
                  onPaste={ tableOnPaste }
                  onMouseOver={ tableOnMouseOver }
                  onMouseDown={ tableOnMouseDown }
                  onMouseUp={ tableOnMouseUp }
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
                  const thisScanType = metadataContext.scanTypes.typesByName.get(sample.scanType)!;

                  const cellFocusOnThisY = (cellFocusY === sampleIndex);
                  const allowedParameters = new Set(thisScanType.parameters.map((p) => p.typeId));
                  // Build a temporary map, from parameter Ids to their ScanParameterSettings in this row's (config's) scan type.
                  // This may be an incomplete mapping, because some parameters we need to display may not be in the scan type.
                  const scanParameterSettingsMap: Map<ParamUid, ScanParameterSettings> =
                          new Map(thisScanType.parameters.map((sp) => [sp.typeId, sp]));

                  displayedParameters.forEach((p, paramIndex) => {
                    const scanParameterSettings:ScanParameterSettings | undefined = scanParameterSettingsMap.get(p.id)

                    const unused = !allowedParameters.has(p.id);
                    // readOnly may not be defined, so this could effectively still be true | false | undefined.
                    const readOnly = scanParameterSettings?.readOnly;
                    const activated = (cellFocusX === (paramIndex+FIXED_COLUMN_COUNT)) && cellFocusOnThisY;
                    const activationStatus = activated ? lastActivationMethod : CellActivationStatus.Inactive;
                    const cellClasses = truthyJoin(
                            "samplecell",
                            (unused && "unused"),
                            (readOnly && "readonly"),
                            ...selectionBorderClasses(paramIndex+FIXED_COLUMN_COUNT, sampleIndex)
                          );
                    const td = (
                      <td key={ p.id }
                          data-sample-x={paramIndex+FIXED_COLUMN_COUNT}
                          data-sample-y={sampleIndex}
                          data-sample-readonly={readOnly || 0}
                          data-sample-unused={unused || 0}
                          className={ cellClasses }
                        >
                        <SampleTableCell x={paramIndex+FIXED_COLUMN_COUNT} y={sampleIndex}
                                    key={ p.id }
                                    cellKey={ p.id }
                                    isUnused={unused}
                                    activationStatus={activationStatus}
                                    isReadOnly={readOnly}
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
                      <td key="name"
                          data-sample-x={0}
                          data-sample-y={sampleIndex}
                          data-sample-unused={0}
                          className={truthyJoin("samplecell", ...selectionBorderClasses(0, sampleIndex))}
                        >
                        <SampleTableCell x={0} y={sampleIndex}
                            key="name"
                            cellKey="name"
                            activationStatus={((cellFocusX === 0) && cellFocusOnThisY) ? lastActivationMethod : CellActivationStatus.Inactive}
                            cellFunctions={cellFunctions}
                            value={ sample.name } />
                      </td>
                      <td key="description"
                          data-sample-x={1}
                          data-sample-y={sampleIndex}
                          data-sample-unused={0}
                          className={truthyJoin("samplecell", ...selectionBorderClasses(1, sampleIndex))}
                        >
                        <SampleTableCell x={1} y={sampleIndex}
                            key="description"
                            cellKey="description"
                            activationStatus={((cellFocusX === 1) && cellFocusOnThisY) ? lastActivationMethod : CellActivationStatus.Inactive}
                            cellFunctions={cellFunctions}
                            value={ sample.description } />
                      </td>
                      <td key="scantype"
                          data-sample-x={2}
                          data-sample-y={sampleIndex}
                          data-sample-unused={0}
                          className={truthyJoin("samplecell", ...selectionBorderClasses(2, sampleIndex))}
                        >
                        <SampleTableCell x={2} y={sampleIndex}
                            key="scantype"
                            cellKey="scantype"
                            activationStatus={((cellFocusX === 2) && cellFocusOnThisY) ? lastActivationMethod : CellActivationStatus.Inactive}
                            cellFunctions={cellFunctions}
                            value={ sample.scanType }
                            description="Scan Type to use for this sample."
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
