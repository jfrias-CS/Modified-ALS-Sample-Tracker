import React, { useState, useEffect, useRef } from 'react';
import 'bulma/css/bulma.min.css';

import { CellFunctions, CellValidationStatus, CellHelpStatus, CellHelpMessage, CellValidationResult, CellNavigationDirection, CellSubcomponentFunctions } from './cellDto.ts';
import { CellTextfield } from './cellTextfield.tsx';


// Settings passed in with the React component
interface EditableCellParameters {
  cellKey: string;
  x: number;
  y: number;
  isActivated: boolean;
  value: string;
  description?: string;
  isUnused?: boolean;
  cellFunctions: CellFunctions;
}


// Just a small helper function to concatenate CSS class names
function classNames(...names:(string|null|undefined)[]): string {
  return names.filter((name) => (name !== undefined) && (name !== null) && (name.length > 0)).join(" "); 
}


// Given a DOM node, walk up the tree looking for a node of type "div"
// with class "value" assigned to it, and return the pixel width of that element,
// or 0 if a matching node can't be found.
function findWidth(node: HTMLElement): number {
  var n = node.nodeName || "";
  n = n.trim().toLowerCase();
  const p = node.parentNode as HTMLElement | null;
  if (n != "td") {
      if (!p) { return 0 } else { return findWidth(p) }
  } else {
    const c = node.classList;
    if (c.contains("samplecell")) {
        const rect = node.getBoundingClientRect();
        return rect.width;
    } else if (!p) {
      return 0
    } else {
      return findWidth(p)
    }
  }
}


function SampleTableCell(settings: EditableCellParameters) {

  const [justActivated, setJustActivated] = useState<boolean>(settings.isActivated);
  const [lastMinimumWidth, setLastMinimumWidth] = useState<string>("23px");
  const [helpMessage, setHelpMessage] = useState<CellHelpMessage>({status: CellHelpStatus.Hide });

  const valueRef = useRef<HTMLDivElement>(null);


  function validate(value: string): CellValidationResult {
    return settings.cellFunctions.validate(settings.x, settings.y, value);
  }


  function save(inputValue: string): CellValidationResult {
    // If the save is successful we expect settings.value to change
    // which will update the control.
    var value = inputValue.replace(/&nbsp;|\u202F|\u00A0/g, ' ');
    value = value.replace(/\n/g, '');
    value = value.trim();
    return settings.cellFunctions.save(settings.x, settings.y, value);
  }


  function setHelp(help: CellHelpMessage) {
    setHelpMessage(help);
  }


  // This handles keyboard-based navigation for the table cell.
  // It's meant to be called after the specific input component does its own business.
  // Returns true if the outcome is a move to another cell, false otherwise.
  function testKeyForMovement(event: React.KeyboardEvent<HTMLInputElement>, useArrows: boolean): boolean {
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
    // we measure the width of the cell and set the input element width to match
    // before revealing it.
    if (settings.isActivated) {
      var w = 20;
      if (valueRef.current) {
        w = findWidth( valueRef.current as HTMLElement);
        // 22 pixels accounts for the extra padding of the input element
        // relative to the table cell when it's showing the value element.
        w = Math.max(w - 22, 20);
      }
      setLastMinimumWidth(`${w}px`);
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
  }

  const cellClass = classNames("samplecell", justActivated ? "editing" : "", settings.isUnused ? "unused" : "", inputColor);
  const helpClass = classNames("notify", help ? "disclosed" : "");

  return (
    <td key={ settings.cellKey }
        data-sample-x={settings.x}
        data-sample-y={settings.y}
        data-sample-unused={settings.isUnused || 0}
        className={ cellClass }
    >
      <div>
        <div className="value" ref={ valueRef }>{ settings.isUnused ? (<span>&nbsp;</span>) : settings.value }</div>
        <div className="cellTableInput">

          <CellTextfield
            isActivated={justActivated}
            value={settings.value}
            description={settings.description}
            lastMinimumWidth={lastMinimumWidth}
            cellFunctions={cellSubcomponentFunctions} />

          <div className={ helpClass }> 
            <div className="notify-content">
              { help }
            </div>
          </div>
        </div>
      </div>
    </td>
  );
}


export { SampleTableCell }
export type { CellFunctions }
