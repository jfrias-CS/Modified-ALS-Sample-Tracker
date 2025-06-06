import React, { useState, useEffect, useRef, useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faAngleDown, faAngleRight, faSpinner, faCheck, faUndo, faRedo } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import { Guid, truthyJoin, sortWithNumberParsing } from '../../components/utils.tsx';
import { ScanTypeName, ParamUid, ScanParameterSettings, ParameterChoice } from '../../scanTypes.ts';
import { SampleConfiguration, SampleConfigurationSet, SampleConfigurationField, SampleConfigurationFieldSelection } from '../../sampleConfiguration.ts';
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


// Given a DOM node, walks up the tree looking for a node of type "table".
// If found, return it, otherwise return null.
function findEnclosingTable(node: HTMLElement): HTMLElement | null {
  var n = node.nodeName || "";
  if (n.trim().toLowerCase() == "table") { return node; }
  const p = node.parentNode;
  if (!p) { return null; } else { return findEnclosingTable(p as HTMLElement); }
}


const SampleTable: React.FC<SampleTableProps> = (props) => {

  const setId = props.setid;

  const metadataContext = useContext(MetadataContext);
  const [sortedSampleIds, setSortedSampleIds] = useState<Guid[]>([]);

  const [tableHasFocus, setTableHasFocus] = useState<boolean>(false);
  const [cellFocusX, setCellFocusX] = useState<number | null>(null);
  const [cellFocusY, setCellFocusY] = useState<number | null>(null);
  const [lastActivationMethod, setLastActivationMethod] = useState<CellActivationStatus>(CellActivationStatus.Inactive);
  const tableRef = useRef<HTMLTableElement>(null);

  const [tableSortColumn, setTableSortColumn] = useState<SampleConfigurationFieldSelection>({ field: SampleConfigurationField.Name, parameter: null });
  const [tableSortReverse, setTableSortReverse] = useState<boolean>(false);

  const [cellMouseDown, setCellMouseDown] = useState<boolean>(false);
  const [cellMouseDownX, setCellMouseDownX] = useState<number | null>(null);
  const [cellMouseDownY, setCellMouseDownY] = useState<number | null>(null);
  const [cellMouseMoveX, setCellMouseMoveX] = useState<number | null>(null);
  const [cellMouseMoveY, setCellMouseMoveY] = useState<number | null>(null);

  const [syncTimer, setSyncTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(SyncState.Idle);
  const [tableHelpDisclosed, setTableHelpDisclosed] = useState<boolean>(false);


  useEffect(() => {
    if ((setId === undefined) || (!setId.trim())) { return; }

    if (metadataContext.loadingState != MetaDataLoadingState.Succeeded) { return; }

    const thisSet = metadataContext.sets.getById(setId.trim() as Guid);
    if (thisSet === undefined) { return; }

    const sortedSampleIds = sortSampleIds(thisSet, tableSortColumn, tableSortReverse);
    setSortedSampleIds(sortedSampleIds);

  }, [setId, metadataContext.changeCounter, metadataContext.loadingState]);


  function sortSampleIds(thisSet: SampleConfigurationSet, field: SampleConfigurationFieldSelection, reverse: boolean): Guid[] {
    const ids = thisSet.allValid();
    var sorted:SampleConfiguration[] = [];
    switch (field.field) {
      case SampleConfigurationField.Description:
        sorted = ids.sort((a, b) => { return sortWithNumberParsing(a.description, b.description, reverse)});
        break;
      case SampleConfigurationField.ScanType:
        sorted = ids.sort((a, b) => { return sortWithNumberParsing(a.scanType, b.scanType, reverse)});
        break;
      default:  // Default is to sort by Name
        sorted = ids.sort((a, b) => { return sortWithNumberParsing(a.name, b.name, reverse)});
        break;
      case SampleConfigurationField.Parameter:
        if (field.parameter !== null) {
          sorted = ids.sort((a, b) => { return sortWithNumberParsing(a.parameters.get(field.parameter!), b.parameters.get(field.parameter!), reverse)});
        }
        break;
      }
    return sorted.map((s) => s.id);
  }


  function clickedTableSortHeader(f:SampleConfigurationFieldSelection) {
    const thisSet = metadataContext.sets.getById(setId.trim() as Guid);
    if (thisSet === undefined) { return; }

    if ((f.field == tableSortColumn.field) && (f.parameter == tableSortColumn.parameter)) {
      const sortedSampleIds = sortSampleIds(thisSet, tableSortColumn, !tableSortReverse);
      setTableSortReverse(!tableSortReverse);
      setSortedSampleIds(sortedSampleIds);
    } else  {
      const sortedSampleIds = sortSampleIds(thisSet, f, false);
      setTableSortColumn(f);
      setTableSortReverse(false);
      setSortedSampleIds(sortedSampleIds);
    }
  }


  // Triggered one time only, whenever the input is blurred.
  // Used to ensure the latest state values are being validated (instead of old ones),
  // after a click event on a pulldown item.
  useEffect(() => {
    if (!tableHasFocus) {
    }
  }, [tableHasFocus]);


  function onTableHelpShow() {
    setTableHelpDisclosed(true);
  }

  function onTableHelpHide() {
    setTableHelpDisclosed(false);
  }


  function tableOnFocus(event: React.FocusEvent<HTMLElement>) {
    if ((event.target.nodeName.toLowerCase() == "table") && event.target.classList.contains("sampletable")) {
      setTableHasFocus(true);
    }
  }

  function tableOnBlur(event: React.FocusEvent<HTMLElement>) {
    if ((event.target.nodeName.toLowerCase() == "table") && event.target.classList.contains("sampletable")) {
      setTableHasFocus(false);
    }
  }


  function tableOnPointerDown(event: React.PointerEvent<HTMLElement>) {
    const foundCell = findAnEditableCell(event.target as HTMLElement);
    if (foundCell) {
      setCellMouseDown(true);
      setCellMouseDownX(foundCell.x);
      setCellMouseDownY(foundCell.y);
      setCellMouseMoveX(foundCell.x);
      setCellMouseMoveY(foundCell.y);

      // We can't do this because it creates a reference to the function in a previous
      // instance of the SampleTable react object, which contains the old useState values,
      // sowing chaos and confusion.
      // document.addEventListener("mouseup", tableOnMouseUp, {once: true});

      // We can't do this either because it redirects all subsequent events so their
      // target is the table itself, obscuring the element that the pointer was originally over,
      // making the event useless to us.
      //const foundTable = findEnclosingTable(event.target as HTMLElement);
      //if (foundTable) {
      //  foundTable.setPointerCapture(event.pointerId);
      //}
    } else {
      setCellMouseDown(false);
      setCellMouseDownX(null);
      setCellMouseDownY(null);
      setCellMouseMoveX(null);
      setCellMouseMoveY(null);
    }
  }


  function tableOnPointerOver(event: React.PointerEvent<HTMLElement>) {
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


  function tableOnDoubleClick(event: React.MouseEvent<HTMLElement>) {
    const foundCell = findAnEditableCell(event.target as HTMLElement);
    if (foundCell) {
      setCellMouseDownX(foundCell.x);
      setCellMouseDownY(foundCell.y);
      setCellMouseMoveX(foundCell.x);
      setCellMouseMoveY(foundCell.y);
      setCellFocusX(foundCell.x);
      setCellFocusY(foundCell.y);
      setCellMouseDown(false);
      setLastActivationMethod(CellActivationStatus.ByMouse);
    }
  }


  function tableOnPointerUp(event: React.PointerEvent<HTMLElement>) {
    setCellMouseDown(false);
    setCellFocusX(null);
    setCellFocusY(null);
  }


  function tableOnKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key == "Enter") {
      // If we're already in edit mode for a cell, ignore this.
      if ((cellFocusX !== null) || (cellFocusY !== null)) {
        return;
      }
      // If we don't have coordinates for a recent mouse down event, ignore this.
      if ((cellMouseDownX === null) || (cellMouseDownY === null)) {
        return;
      }
      event.preventDefault();
      setCellFocusX(cellMouseDownX);
      setCellFocusY(cellMouseDownY);
      setLastActivationMethod(CellActivationStatus.ByKeyboard);
    } else if (event.key == "Escape") {
      if ((cellFocusX === null) || (cellFocusY === null)) {
        return;
      }

      // If we're intercepting an Escape key from a cell that is currently being edited,
      // we should attempt to focus the table.
      // We don't want to refocus on "close" coming from a cell, because that is called
      // (among other times) when the cell experiences a blur event,
      // which can happen because the user is clicking outside the entire table.
      if (tableRef.current) {
        tableRef.current.focus();
      }
    }

    // We'll only check for movement if we're not currently editing AND there's already a selection.
    if ((cellFocusX == null) && (cellFocusY == null)) {
      if ((cellMouseDownX !== null) && (cellMouseDownY !== null)) {
        var travelVector: Coordinates | null = null;
        switch (event.key) {
          case "ArrowUp":
            travelVector = {x: 0, y: -1};
            break;
          case "ArrowDown":
            travelVector = {x: 0, y: 1};
            break;
          case "ArrowLeft":
            travelVector = {x: -1, y: 0};
            break;
          case "ArrowRight":
            travelVector = {x: 1, y: 0};
            break;
        }
        if (travelVector !== null) {
          if (event.shiftKey && (cellMouseMoveX !== null) && (cellMouseMoveY !== null)) {
            const found = lookForAdjacentCell({x: cellMouseMoveX, y: cellMouseMoveY}, travelVector);
            if (found !== null) {
              setCellMouseMoveX(found.x);
              setCellMouseMoveY(found.y);
            }
          } else {
            var found:Coordinates | null = null;
            if ((cellMouseMoveX !== null) && (cellMouseMoveY !== null)) {
              found = lookForAdjacentCell({x: cellMouseMoveX, y: cellMouseMoveY}, travelVector);
            } else {
              found = lookForAdjacentCell({x: cellMouseDownX, y: cellMouseDownY}, travelVector);
            }
            if (found !== null) {
              setCellMouseDownX(found.x);
              setCellMouseDownY(found.y);
              setCellMouseMoveX(found.x);
              setCellMouseMoveY(found.y);
            }
          }
        }
      }
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

  // For the standard "scan type" column, which uses the autocomplete widget
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

    // The rect of the current selection.
    const lowerX = Math.min(cellMouseDownX, cellMouseMoveX);
    const lowerY = Math.min(cellMouseDownY, cellMouseMoveY);
    const higherX = Math.max(cellMouseDownX, cellMouseMoveX);
    const higherY = Math.max(cellMouseDownY, cellMouseMoveY);

    var sampleRows = [];
    for (var y = lowerY; y <= higherY; y++) {
      sampleRows.push(thisSet!.configurationsById.get(sortedSampleIds[y])!);
    }

    // The first FIXED_COLUMN_COUNT columns of the table always represent these fields in order:
    const fields = [SampleConfigurationField.Name, SampleConfigurationField.Description, SampleConfigurationField.ScanType];
    var selectedFields = [];
    // If the selection overlaps those columns, we push the relevant field names. 
    var lowX = lowerX;
    while (lowX <= Math.min(higherX, FIXED_COLUMN_COUNT-1)) {
      selectedFields.push(fields[lowX]);
      lowX++;
    }

    var selectedParameters = [];
    // If the selection overlaps those columns, we push the relevant field names. 
    var lowX = Math.max(lowerX, FIXED_COLUMN_COUNT);
    while (lowX <= higherX) {
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
    if (c.isEmpty()) { return; }

    // Were there no columns selected, as we would get from a copy of raw text?
    // This will influence pasting behavior.
    const clipboardColumnCount = c.selectedFields.length + c.selectedParameters.length; 

    // The rect of the current selection.  We may re-form this in the process of pasting.
    var upperLeftX = Math.min(cellMouseDownX, cellMouseMoveX);
    var upperLeftY = Math.min(cellMouseDownY, cellMouseMoveY);
    var lowerRightX = Math.max(cellMouseDownX, cellMouseMoveX);
    var lowerRightY = Math.max(cellMouseDownY, cellMouseMoveY);

    const pasteValues = c.asGridOfValues();

    var editedConfigs = [];

    // If we have multiple rows of data to use for pasting, we should stop pasting when we run out of them.
    var stopAtRow = upperLeftY + pasteValues.length;
    // If we are pasting to a selection that's more than one row, we should stop pasting when we hit the bottom of the selection,
    // regardless of how many rows are on the clipboard.
    if (lowerRightY > upperLeftY) {
      stopAtRow = lowerRightY + 1;
      // And if we're also pasting multiple rows of data, we should stop at the end of them,
      // or the end of the selection, whichever is smaller.
      // (If we're just pasting one row, we can duplicate the values for the whole selection.)
      if (pasteValues.length > 1) {
        stopAtRow = Math.min(stopAtRow, upperLeftY + pasteValues.length);
      }
    }
    // We should always stop pasting if we reach the bottom of the table.
    stopAtRow = Math.min(stopAtRow, sortedSampleIds.length);

    // Typically we should paste as many columns as we had selected in the clipboard copy.
    var stopAtColumn = upperLeftX + clipboardColumnCount;
    // But if we are pasting to a selection that's more than one column, we should stop at the end of the selection,
    // regardless of how many columns are available.
    if (lowerRightX > upperLeftX) {
      stopAtColumn = lowerRightX + 1;
      // And if we're also pasting multiple columns of data, we should stop at the end of them,
      // or the end of the selection, whichever is smaller.
      // (If we're just pasting one column, we can duplicate the values for the whole selection.)
      if (clipboardColumnCount > 1) {
        stopAtColumn = Math.min(stopAtColumn, upperLeftX + clipboardColumnCount);
      }
    }
    // We should always stop pasting if we reach the right side of the table.
    stopAtColumn = Math.min(stopAtColumn, FIXED_COLUMN_COUNT + displayedParameters.length);

    var y = 0;
    while (upperLeftY+y < stopAtRow) {

      var editedConfig = thisSet!.configurationsById.get(sortedSampleIds[upperLeftY+y])!.clone();
      const thisScanType = metadataContext.scanTypes.typesByName.get(editedConfig.scanType)!;
      const allowedParameters = new Set(thisScanType.parameters.map((p) => p.typeId));
      // Build a temporary map, from parameter Ids to their ScanParameterSettings in this row's (config's) scan type.
      // This may be an incomplete mapping, because some parameters we paste into may not be in the scan type.
      const scanParameterSettingsMap: Map<ParamUid, ScanParameterSettings> =
              new Map(thisScanType.parameters.map((sp) => [sp.typeId, sp]));

      const currentClipboardRow = pasteValues.length == 1 ? pasteValues[0] : pasteValues[y];

      var x = 0;
      while (upperLeftX+x < stopAtColumn) {
        var pasteValue = currentClipboardRow.length == 1 ? currentClipboardRow[0] : currentClipboardRow[x];
        if (pasteValue === null) { pasteValue = ""; }

        // Name
        if ((upperLeftX+x === 0) && (pasteValue !== "")) {  // Don't allow blank names
          editedConfig.name = pasteValue.replace(/[^A-Za-z0-9\-_]/g, "_");

        // Description
        } else if (upperLeftX+x === 1) {
          editedConfig.description = pasteValue;

        // Scan Type
        } else if (upperLeftX+x === 2) {
          const asScanTypeName = pasteValue as ScanTypeName;
          const newScanType = metadataContext.scanTypes.typesByName.get(asScanTypeName);
          // If the text doesn't resolve to a known Scan Type name, skip all this.
          // We accept invalid values in most columns but accepting one in ScanType would make very ambiguous behavior,
          // since it affects which columns are displayed in the table.
          if (newScanType) {
            editedConfig.scanType = asScanTypeName;
            newScanType!.parameters.forEach((p) => {
              const parameterType = metadataContext.scanTypes.parametersById.get(p.typeId);
              if (parameterType) {
                // Set any missing parameters to defaults.
                if (!editedConfig.parameters.has(parameterType!.id)) {
                  editedConfig.parameters.set(parameterType.id, parameterType.default ?? "");
                }
              }
            });
          }
        // Scan parameters
        } else if ((upperLeftX+x >= FIXED_COLUMN_COUNT) && (((upperLeftX+x)-FIXED_COLUMN_COUNT) < displayedParameters.length)) {
          const paramType = displayedParameters[(upperLeftX+x)-FIXED_COLUMN_COUNT];
          const scanParameterSettings:ScanParameterSettings | undefined = scanParameterSettingsMap.get(paramType.id)

          const unused = !allowedParameters.has(paramType.id);
          // readOnly may not be defined, so we'll cast it for the sake of clarity.
          const readOnly = scanParameterSettings?.readOnly ? true : false;
          if (!readOnly && !unused) {
            editedConfig.parameters.set(paramType.id, pasteValue);
          }
        }
        x++;
      }

      editedConfigs.push(editedConfig);
      y++;
    }

    thisSet!.addOrReplaceWithHistory(editedConfigs);
    metadataContext.changed();
    contentChanged();
  }

  // Add the vector to the given currentPosition until it points to a table cell that is
  // valid for editing, then return that position, or return null if we run off the edge of the table.
  function lookForAdjacentCell(currentPosition: Coordinates, vector: Coordinates): Coordinates | null {
    // Sanity check
    if ((vector.x == 0) && (vector.y == 0)) { return null; }
    const nextPosition = { x: currentPosition.x + vector.x, y: currentPosition.y + vector.y };
    const xMax = displayedParameters.length + FIXED_COLUMN_COUNT;  // Standard field columns on the left
    const yMax = sortedSampleIds.length;
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
    const thisConfig = thisSet!.configurationsById.get(sortedSampleIds[nextPosition.y]);

    const allowedParameters = metadataContext.scanTypes.typesByName.get(thisConfig!.scanType)!.parameters;
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
  // and used when rendering the table,
  // that validates the given input value based on its cell's x,y location in the table.
  // It relies on the displayedParameters constant, calculated just above.
  function cellValidator(x: number, y: number, value: string): CellValidationResult {

    // Validate Name
    if (x === 0) {
      if (value == "") {
        return { status: CellValidationStatus.Failure, message: "Name cannot be blank." };
      } else if (sortedSampleIds.filter((sId) => thisSet!.configurationsById.get(sId)!.name == value).length > 1) {
        return { status: CellValidationStatus.Failure, message: "Name must be unique on bar." };
      } else if (value.search(/[^A-Za-z0-9\-_]/g) >= 0) {
        return { status: CellValidationStatus.Failure, message: "Name must consist only of letters, numbers, underscore, or dash." };
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


  // A callback function passed to every SampleTableCell (non-header table cell in samples table)
  // that should be called if the cell is in editing mode and wishes to close.
  function cellClose(x: number, y: number): void {
    // We only act on a "close" call coming from the cell that's currently
    // selected for editing.  If some other cell is selected, the caller is effectively already closed.
    if ((cellFocusX == x) && (cellFocusY == y)) {
      setCellFocusX(null);
      setCellFocusY(null);
      setCellMouseDownX(cellFocusX);
      setCellMouseDownY(cellFocusY);
      setCellMouseMoveX(cellFocusX);
      setCellMouseMoveY(cellFocusY);
    }
  }


  // A function passed to every SampleTableCell (non-header table cell in samples table)
  // that saves the given input value to the SampleConfiguration indicated by the
  // table cell at the given x,y location.
  // It relies on the displayedParameters constant, calculated just above.
  function cellSave(x: number, y: number, newValue: string): CellValidationResult {

    const thisConfig = thisSet!.configurationsById.get(sortedSampleIds[y]);
    if (!thisConfig) {
      return { status: CellValidationStatus.Failure, message: "Error: SampleConfiguration does not exist!" }
    }

    var editedConfig = thisConfig.clone();

    // Name
    if (x === 0) {
      editedConfig.name = newValue.replace(/[^A-Za-z0-9\-_]/g, "_");

    // Description
    } else if (x === 1) {
      editedConfig.description = newValue;

    // Scan Type
    } else if (x === 2) {
      const asScanTypeName = newValue as ScanTypeName;
      const newScanType = metadataContext.scanTypes.typesByName.get(asScanTypeName);
      // If the text doesn't resolve to a known Scan Type name, skip all this.
      // We accept invalid values in most columns but accepting one in ScanType would make very ambiguous behavior,
      // since it affects which columns are displayed in the table.
      if (newScanType) {
        editedConfig.scanType = asScanTypeName;
        newScanType!.parameters.forEach((p) => {
          const parameterType = metadataContext.scanTypes.parametersById.get(p.typeId);
          if (parameterType) {
            // Set any missing parameters to defaults.
            if (!editedConfig.parameters.has(parameterType!.id)) {
              editedConfig.parameters.set(parameterType.id, parameterType.default ?? "");
            }
          }
        });
      }
    // Validate scan parameters
    } else if ((x >= FIXED_COLUMN_COUNT) && ((x-FIXED_COLUMN_COUNT) < displayedParameters.length)) {
      const paramType = displayedParameters[x - FIXED_COLUMN_COUNT];
      editedConfig.parameters.set(paramType.id, newValue);
    }

    thisSet!.addOrReplaceWithHistory([editedConfig]);
    metadataContext.changed();
    contentChanged();

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
    close: cellClose,
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

  // Construct table headers

  const sortDirectionStyle = tableSortReverse ? "sortedup" : "sorteddown";
  var tableHeaders = [
      (<th key="name"
            className={truthyJoin("sortable", (tableSortColumn.field == SampleConfigurationField.Name) && sortDirectionStyle)}
            onClick={ () => clickedTableSortHeader({ field: SampleConfigurationField.Name, parameter: null }) }
            scope="col">Name</th>),
      (<th key="description"
            className={truthyJoin("sortable", (tableSortColumn.field == SampleConfigurationField.Description) && sortDirectionStyle)}
            onClick={ () => clickedTableSortHeader({ field: SampleConfigurationField.Description, parameter: null }) }
            scope="col">Description</th>),
      (<th key="scantype"
            className={truthyJoin("sortable", (tableSortColumn.field == SampleConfigurationField.ScanType) && sortDirectionStyle)}
            onClick={ () => clickedTableSortHeader({ field: SampleConfigurationField.ScanType, parameter: null }) }
            scope="col">Scan Type</th>)
  ];

  displayedParameters.forEach((p) => {
    tableHeaders.push((
      <th key={p.id}
          className={truthyJoin("sortable", ((tableSortColumn.field == SampleConfigurationField.Parameter) && (tableSortColumn.parameter == p.id)) && sortDirectionStyle)}
          onClick={ () => clickedTableSortHeader({ field: SampleConfigurationField.Parameter, parameter: p.id }) }
          scope="col">{ p.name }</th>
    ));
  });

  // Construct a message reporting the sync status between this page and the server

  var syncStatusMessage: JSX.Element | null = null;
  if (syncState == SyncState.Requested) {
    syncStatusMessage = (<div><FontAwesomeIcon icon={faSpinner} spin={true} /> Saving Changes</div>); 
  } else if (syncState == SyncState.Completed) {
    syncStatusMessage = (<div><FontAwesomeIcon icon={faCheck} /> Changes Saved</div>);
  } else if (syncState == SyncState.Failed) {
    syncStatusMessage = (<div><FontAwesomeIcon icon={faExclamationTriangle} color="darkred" /> Error Saving! Are you logged in?</div>);
  }

  const allowSampleImport = false;  // Bulk sample import form is disabled for now

  return (
    <>

      <nav className="level">

        <div className="level-left">
          <div className="level-item">
            <p className="subtitle is-5"><strong>{ sortedSampleIds.length }</strong> samples</p>
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
              { syncStatusMessage }
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
        { sortedSampleIds.length == 0 ? (
          !tableHelpDisclosed ? (
              <nav className="level">
                <div className="level-left">
                  <div className="level-item">
                    <p>(You might want to check out this brief</p>
                  </div>
                  <div className="level-item">
                    <button className="button" onClick={ onTableHelpShow }>Tutorial</button>
                  </div>
                  <div className="level-item">
                    <p>on sample editing.)</p>
                  </div>
                </div>
              </nav>
            ) : (        
              <div className="modal is-active">
                <div className="modal-background"></div>
                <div className="modal-card">
                  <header className="modal-card-head">
                    <p className="modal-card-title">How To Edit Samples</p>
                    <button className="delete" aria-label="close" onClick={ onTableHelpHide }></button>
                  </header>
                  <section className="modal-card-body">
                    <video src={`${import.meta.env.BASE_URL}/sample_table_video_tutorial.mp4`} controls={true} autoPlay={true} loop={true} muted={true} playsInline={true}></video>                    
                  </section>
                </div>
              </div>
              
            )
        ) : (
          <table className="sampletable"
                  tabIndex={0}
                  ref={ tableRef }
                  onFocus={ tableOnFocus }
                  onBlur={ tableOnBlur }
                  onCopy={ tableOnCopy }
                  onPaste={ tableOnPaste }
                  onDoubleClick={ tableOnDoubleClick }
                  onPointerOver={ tableOnPointerOver }
                  onPointerDown={ tableOnPointerDown }
                  onPointerUp={ tableOnPointerUp }
                  onKeyDown={ tableOnKeyDown }
              >
            <thead>
              <tr key="headers">
                { tableHeaders }
              </tr>
            </thead>
            <tbody>
              {
                sortedSampleIds.map((sampleId, sampleIndex) => {
                  const sample = thisSet!.configurationsById.get(sampleId)!;
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
                    const paramValue = sample.parameters.get(p.id) ?? "";
                    const validationResult = cellValidator(paramIndex+FIXED_COLUMN_COUNT, sampleIndex, paramValue);
                    const validValue = validationResult.status == CellValidationStatus.Success ? true : false;
                    const cellClasses = truthyJoin(
                            "samplecell",
                            (!validValue && "invalid"),
                            (unused && "unused"),
                            (readOnly && "readonly"),
                            ...selectionBorderClasses(paramIndex+FIXED_COLUMN_COUNT, sampleIndex)
                          );
                    const td = (
                      <td key={ `${p.id}-${metadataContext.changeCounter}` }
                          data-sample-x={paramIndex+FIXED_COLUMN_COUNT}
                          data-sample-y={sampleIndex}
                          data-sample-readonly={readOnly || 0}
                          data-sample-unused={unused || 0}
                          className={ cellClasses }
                        >
                        <SampleTableCell x={paramIndex+FIXED_COLUMN_COUNT} y={sampleIndex}
                                    key={ `${p.id}-${metadataContext.changeCounter}` }
                                    cellKey={ `${p.id}-${metadataContext.changeCounter}` }
                                    isUnused={ unused }
                                    activationStatus={ activationStatus }
                                    isReadOnly={ readOnly }
                                    cellFunctions={ cellFunctions }
                                    description={ p.description }
                                    value={ paramValue }
                                    choices={ p.choices }
                            />
                      </td>);
                    cells.push(td);
                  });

                  const nameValidationResult = cellValidator(0, sampleIndex, sample.name);
                  const nameValidValue = nameValidationResult.status == CellValidationStatus.Success ? true : false;

                  const descriptionValidationResult = cellValidator(1, sampleIndex, sample.description);
                  const descriptionValidValue = descriptionValidationResult.status == CellValidationStatus.Success ? true : false;

                  return (
                    <tr key={ `${sampleId}-${metadataContext.changeCounter}` }>
                      <td key={ `${sampleId}-${metadataContext.changeCounter}-name` }
                          data-sample-x={0}
                          data-sample-y={sampleIndex}
                          data-sample-unused={0}
                          className={truthyJoin("samplecell", (!nameValidValue && "invalid"), ...selectionBorderClasses(0, sampleIndex))}
                        >
                        <SampleTableCell x={0} y={sampleIndex}
                            key={ `${sampleId}-${metadataContext.changeCounter}-name` }
                            cellKey={ `${sampleId}-${metadataContext.changeCounter}-name` }
                            activationStatus={((cellFocusX === 0) && cellFocusOnThisY) ? lastActivationMethod : CellActivationStatus.Inactive}
                            cellFunctions={cellFunctions}
                            value={ sample.name } />
                      </td>
                      <td key={ `${sampleId}-${metadataContext.changeCounter}-description` }
                          data-sample-x={1}
                          data-sample-y={sampleIndex}
                          data-sample-unused={0}
                          className={truthyJoin("samplecell", (!descriptionValidValue && "invalid"), ...selectionBorderClasses(1, sampleIndex))}
                        >
                        <SampleTableCell x={1} y={sampleIndex}
                            key={ `${sampleId}-${metadataContext.changeCounter}-description` }
                            cellKey={ `${sampleId}-${metadataContext.changeCounter}-description` }
                            activationStatus={((cellFocusX === 1) && cellFocusOnThisY) ? lastActivationMethod : CellActivationStatus.Inactive}
                            cellFunctions={cellFunctions}
                            value={ sample.description } />
                      </td>
                      <td key={ `${sampleId}-${metadataContext.changeCounter}-scantype` }
                          data-sample-x={2}
                          data-sample-y={sampleIndex}
                          data-sample-unused={0}
                          className={truthyJoin("samplecell", ...selectionBorderClasses(2, sampleIndex))}
                        >
                        <SampleTableCell x={2} y={sampleIndex}
                            key={ `${sampleId}-${metadataContext.changeCounter}-scantype` }
                            cellKey={ `${sampleId}-${metadataContext.changeCounter}-scantype` }
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
