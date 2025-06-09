import React, { useState, useEffect, useRef } from 'react';
import 'bulma/css/bulma.min.css';

import { truthyJoin } from '../../../../components/utils.tsx';
import { ParameterChoice } from '../../../../scanTypeDto.ts';
import { CellFunctions, CellActivationStatus, CellValidationStatus, CellHelpStatus, CellHelpMessage, CellValidationResult, CellNavigationDirection, CellSubcomponentFunctions } from './cellDto.ts';
import { CellTextfield } from './cellTextfield.tsx';
import { CellAutocomplete } from './cellAutocomplete.tsx';


// Settings passed in with the React component
interface EditableCellParameters {
  cellKey: string;
  x: number;
  y: number;
  activationStatus: CellActivationStatus;
  value: string;
  description?: string;
  // If this is set, a read-only alert will be appended to the description,
  // and all edits to the cell will revert to the previous value.
  isReadOnly?: boolean;
  isUnused?: boolean;
  cellFunctions: CellFunctions;
  // This parameter is used to indicate that a CellAutocomplete should be
  // used instead of a CellTextfield.
  // (Developer note: It's the only parameter that makes the editable table code
  // non-generic.)
  choices?: ParameterChoice[];
}


// Given a DOM node, walk up the tree looking for a node of type "div"
// with class "value" assigned to it, and return the pixel width of that element,
// or 0 if a matching node can't be found.
function findCellSize(node: HTMLElement): { h: number, w: number } | null {
  var n = node.nodeName || "";
  n = n.trim().toLowerCase();
  const p = node.parentNode as HTMLElement | null;
  if (n != "td") {
      if (!p) { return null } else { return findCellSize(p) }
  } else {
    const c = node.classList;
    if (c.contains("samplecell")) {
        const rect = node.getBoundingClientRect();
        return { w: rect.width, h: rect.height };
    } else if (!p) {
      return null
    } else {
      return findCellSize(p)
    }
  }
}


function SampleTableCell(settings: EditableCellParameters) {

  const [justActivated, setJustActivated] = useState<CellActivationStatus>(CellActivationStatus.Inactive);
  const [lastKnownHeight, setLastKnownHeight] = useState<string>("unset");
  const [lastKnownWidth, setLastKnownWidth] = useState<string>("unset");
  const [helpMessages, setHelpMessages] = useState<JSX.Element[]>([]);

  const valueRef = useRef<HTMLDivElement>(null);


  function validate(value: string): CellValidationResult {
    return settings.cellFunctions.validate(settings.x, settings.y, value);
  }


  function save(inputValue: string): CellValidationResult {
    // Filtering out strange versions of space, for sanity.
    var value = inputValue.replace(/\u202F|\u00A0/g, ' ');
    // No multi-line inputs are allowed for table cells.
    value = value.replace(/\n/g, ' ');
    value = value.trim();
    // If the save is successful we expect settings.value to change
    // which will update the control.
    return settings.cellFunctions.save(settings.x, settings.y, value);
  }


  function close(): void {
    return settings.cellFunctions.close(settings.x, settings.y);
  }


  function setHelp(help: CellHelpMessage[]) {
    const helpElements = help.map((m, i) => {
      if (m.status == CellHelpStatus.Info) {
        return (<p key={i} className="help is-info">{ m.message }</p>);
      } else if (m.status == CellHelpStatus.Danger) {
        return (<p key={i} className="help is-danger">{ m.message }</p>);
      } else {
        return (<p key={i} className="help">{ m.message }</p>);
      }
    });
    if (settings.isReadOnly) {
      helpElements.push((<p key="ro" className="help is-warning">This value is read-only.</p>));
    }
    setHelpMessages(helpElements);
  }


  // This handles keyboard-based navigation for the table cell.
  // It's meant to be called after the specific input component does its own business.
  // Returns true if the outcome is a move to another cell, false otherwise.
  function testKeyForMovement(event: React.KeyboardEvent<HTMLInputElement| HTMLTextAreaElement>, useArrows: boolean): boolean {
    var didMove: CellValidationStatus = CellValidationStatus.Failure;

    switch (event.key) {
      case "Enter":
        didMove = settings.cellFunctions.move(settings.x, settings.y, CellNavigationDirection.Down);
        break;
      case "ArrowDown":
        if (useArrows) {
          didMove = settings.cellFunctions.move(settings.x, settings.y, CellNavigationDirection.Down);
        }
        break;
      case "ArrowUp":
        if (useArrows) {
          didMove = settings.cellFunctions.move(settings.x, settings.y, CellNavigationDirection.Up);
        }
        break;
      case "Tab":
        if (event.shiftKey) {
          didMove = settings.cellFunctions.move(settings.x, settings.y, CellNavigationDirection.Left);
        } else {
          didMove = settings.cellFunctions.move(settings.x, settings.y, CellNavigationDirection.Right);
        }
        break;
      case "Escape":
        settings.cellFunctions.close(settings.x, settings.y);
        didMove = CellValidationStatus.Success;
        break;
      }
    if (didMove == CellValidationStatus.Success) {
      event.preventDefault();
      return true;
    }
    return false;
  }


  useEffect(() => {
    // When the state goes from inactive to active,
    // we measure the size of the cell and set the input element to match
    // before revealing it.
    if (settings.activationStatus != CellActivationStatus.Inactive) {
      var w = "unset";
      var h = "unset";
      if (valueRef.current) {
        const d = findCellSize( valueRef.current as HTMLElement);
        if (d !== null) {
          // 6 pixels to account for the padding that a cell in non-editing mode gets
          const height = Math.max(d.h - 6, 20)
          // 10 pixels accounts for the extra padding of the input element
          // relative to the table cell when it's showing the value element.
          const width = Math.max(d.w - 10, 20)
          h = `${height}px`;
          w = `${width}px`;
        }
      }
      setLastKnownHeight(h);
      setLastKnownWidth(w);
    }
    // This state value is used to create a delayed reaction, where the
    // input element is revealed _after_ the size of the table cell is measured.
    // Otherwise we would be attempting to measure a table cell that has already
    // revealed the input field, and the value element would have width of 0
    // since it's hidden by "display: none".
    setJustActivated(settings.activationStatus);
    return () => {};
  }, [settings.activationStatus]);


  // Now we have all the functions we need 
  const cellSubcomponentFunctions: CellSubcomponentFunctions = {
    validate: validate,
    save: save,
    close: close,
    setHelp: setHelp,
    testKeyForMovement: testKeyForMovement
  }

  const divClass = truthyJoin((justActivated != CellActivationStatus.Inactive) && "editing");
  const helpClass = truthyJoin("notify", (helpMessages.length > 0) && "disclosed");

  return (
      <div className={ divClass }>
        <div className="value" ref={ valueRef }>{ settings.isUnused ? (<span>&nbsp;</span>) : settings.value }</div>
          <div className="cellTableInput">{
              settings.choices ?
              (<CellAutocomplete
                activationStatus={ justActivated }
                value={ settings.value }
                choices={ settings.choices }
                description={ settings.description }
                isReadOnly={ settings.isReadOnly }
                lastKnownWidth={ lastKnownWidth }
                cellFunctions={ cellSubcomponentFunctions } />)
              : (<CellTextfield
                activationStatus={ justActivated }
                value={ settings.value }
                description={ settings.description }
                isReadOnly={ settings.isReadOnly }
                lastKnownHeight={ lastKnownHeight }
                lastKnownWidth={ lastKnownWidth }
                cellFunctions={ cellSubcomponentFunctions } />)
            }<div className={ helpClass }> 
              <div className="notify-content">
                { helpMessages }
              </div>
            </div>
          </div>
      </div>
  );
}


export { SampleTableCell }
