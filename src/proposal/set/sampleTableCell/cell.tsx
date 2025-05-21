import React, { useState, useEffect, useRef } from 'react';
import 'bulma/css/bulma.min.css';

import { truthyJoin } from '../../../components/utils.tsx';
import { ParameterChoice } from '../../../scanTypes.ts';
import { CellFunctions, CellValidationStatus, CellHelpStatus, CellHelpMessage, CellValidationResult, CellNavigationDirection, CellSubcomponentFunctions } from './cellDto.ts';
import { CellTextfield } from './cellTextfield.tsx';
import { CellAutocomplete } from './cellAutocomplete.tsx';


// Settings passed in with the React component
interface EditableCellParameters {
  cellKey: string;
  x: number;
  y: number;
  isActivated: boolean;
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

  const [justActivated, setJustActivated] = useState<boolean>(settings.isActivated);
  const [lastMinimumHeight, setLastMinimumHeight] = useState<string>("unset");
  const [lastMinimumWidth, setLastMinimumWidth] = useState<string>("unset");
  const [helpMessage, setHelpMessage] = useState<CellHelpMessage>({status: CellHelpStatus.Hide });

  const valueRef = useRef<HTMLDivElement>(null);


  function validate(value: string): CellValidationResult {
    return settings.cellFunctions.validate(settings.x, settings.y, value);
  }


  function save(inputValue: string): CellValidationResult {
    // Filtering out strange versions of space, for sanity.
    var value = inputValue.replace(/&nbsp;|\u202F|\u00A0/g, ' ');
    // No multi-line inputs are allowed for table cells.
    value = value.replace(/\n/g, '');
    value = value.trim();
    // If the save is successful we expect settings.value to change
    // which will update the control.
    return settings.cellFunctions.save(settings.x, settings.y, value);
  }


  function setHelp(help: CellHelpMessage) {
    setHelpMessage(help);
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
        if (didMove == CellValidationStatus.Success) {
          event.preventDefault();
        }
        break;
    }

    if (didMove == CellValidationStatus.Success) {
      return true;
    }
    return false;
  }


  useEffect(() => {
    // When the state goes from inactive to active,
    // we measure the size of the cell and set the input element to match
    // before revealing it.
    if (settings.isActivated) {
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
      setLastMinimumHeight(h);
      setLastMinimumWidth(w);
    }
    // This state value is used to create a delayed reaction, where the
    // input element is revealed _after_ the size of the table cell is measured.
    // Otherwise we would be attempting to measure a table cell that has already
    // revealed the input field, and the value element would have width of 0
    // since it's hidden by "display: none".
    setJustActivated(settings.isActivated);
    return () => {};
  }, [settings.isActivated]);


  // Now we have all the functions we need 
  const cellSubcomponentFunctions: CellSubcomponentFunctions = {
    validate: validate,
    save: save,
    setHelp: setHelp,
    testKeyForMovement: testKeyForMovement
  }


  var inputColor = "";
  var help: JSX.Element | null = null;
  if (helpMessage.status != CellHelpStatus.Hide && helpMessage.message) {

    if (helpMessage.status == CellHelpStatus.Info) {
      help = (<p className="help is-info">{ helpMessage.message }</p>);

    } else if (helpMessage.status == CellHelpStatus.Danger) {
      help = (<p className="help is-danger">{ helpMessage.message }</p>);
      inputColor = "is-danger";

    } else {
      help = (<p className="help">{ helpMessage.message }</p>);
    }

    if (settings.isReadOnly) {
      help = (<>{ help }<p className="help is-warning">This value is read-only.</p></>);
    }
  }

  const divClass = truthyJoin(justActivated && "editing");
  const helpClass = truthyJoin("notify", help && "disclosed");

  return (
      <div className={ divClass }>
        <div className="value" ref={ valueRef }>{ settings.isUnused ? (<span>&nbsp;</span>) : settings.value }</div>
        <div className="cellTableInput">{
            settings.choices ?
            (<CellAutocomplete
              triggerFocus={ justActivated }
              value={ settings.value }
              choices={ settings.choices }
              description={ settings.description }
              isReadOnly={ settings.isReadOnly }
              lastMinimumWidth={ lastMinimumWidth }
              cellFunctions={ cellSubcomponentFunctions } />)
            : (<CellTextfield
              triggerFocus={ justActivated }
              value={ settings.value }
              description={ settings.description }
              isReadOnly={ settings.isReadOnly }
              lastMinimumHeight={ lastMinimumHeight }
              lastMinimumWidth={ lastMinimumWidth }
              cellFunctions={ cellSubcomponentFunctions } />)
          }<div className={ helpClass }> 
            <div className="notify-content">
              { help }
            </div>
          </div>
        </div>
      </div>
  );
}


export { SampleTableCell }
