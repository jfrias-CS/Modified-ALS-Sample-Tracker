import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faX } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';


// Internal state tracking
enum CellValidationStatus { Success, Failure };

interface CellValidationResult {
  status: CellValidationStatus;
  message: string | null;
}

type Validator = (x: number, y: number, inputString: string) => CellValidationResult;
type Navigation = (x: number, y: number, inputString: string) => CellValidationStatus;


interface CellFunctions {
  validator: Validator;
  save: Validator;
  up: Navigation;
  down: Navigation;
  left: Navigation;
  right: Navigation;
}


// Settings passed in with the React component
interface SampleCellParameters {
  elementKey: string;
  x: number;
  y: number;
  isActivated: boolean;
  value: string;
  isUnused?: boolean;
  debounceTime?: number;
  cellFunctions: CellFunctions;
}


// Internal state tracking
enum InputTypingState { NotTyping, IsTyping, StoppedTyping };
enum InputValidationState { NotTriggered, Succeeded, Failed };


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


function SampleCell(settings: SampleCellParameters) {

  // Value in the DOM input element
  const [inputValue, setInputValue] = useState<string>(settings.value);
  // Which item in the dropdown is currently selected, if any, numbered from 0 starting at the top
  const [typingState, setTypingState] = useState<InputTypingState>(InputTypingState.NotTyping);
  const [validationState, setValidationState] = useState<InputValidationState>(InputValidationState.NotTriggered);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [operationInProgress, setOperationInProgress] = useState<boolean>(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [justBlurred, setJustBlurred] = useState<boolean>(false);
  const [justActivated, setJustActivated] = useState<boolean>(settings.isActivated);
  const [lastMinimumWidth, setLastMinimumWidth] = useState<string>("23px");

  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);


  // Triggered one time only, whenever the input is blurred.
  // Used to ensure the latest state values are being validated (instead of old ones),
  // after a click event on a pulldown item.
  useEffect(() => {
    if (!justBlurred) { return; }
    setJustBlurred(false);
    console.log(`Blurred ${settings.x} ${settings.y}`);
//    validate();
  }, [justBlurred]);


  function clickedValue(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
//    setCellActivated(true);
  }


  // This handles keyboard-based selection in the dropdown.
  // Changes to the input value are handled in inputChanged.
  function inputOnKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key == "Escape") {
      reset();
      // Defocus
      if (inputRef.current) {
        inputRef.current.blur();
      }
    } else if (event.key == "Enter") {
      if (inputValue == settings.value) {
        reset();
      } else if (validationState == InputValidationState.Succeeded) {
        save();
      }
    }
  }


  function onInput(event: React.FormEvent<HTMLTableCellElement>) {
//    curText = curText.replace(/&nbsp;|\u202F|\u00A0/g, ' ');
//    curText = curText.replace(/\n/g, '');
  };

  useEffect(() => {
    if (settings.isActivated) {
      console.log("activated");
      var w = 20;
      if (valueRef.current) {
        w = findWidth( valueRef.current as HTMLElement);
        w = Math.max(w - 22, 20);
        console.log(w);
      }
      setLastMinimumWidth(`${w}px`);
    }
    setJustActivated(settings.isActivated);
    //    document.addEventListener("mousedown", clickedElsewhere)
    return () => {
//      document.removeEventListener("mousedown", clickedElsewhere)
    };
  }, [settings.isActivated]);


  function clickedElsewhere(event: MouseEvent) {

    // Given a DOM node, this walks up the tree looking for a node of type "td"
    // with "sampleX" and "sampleY" values in its dataset.
    // If the values match the settings for this SampleCell, we return true.
    function findThisCell(node: HTMLElement): boolean {
      var n = node.nodeName || "";
      n = n.trim().toLowerCase();
      const p = node.parentNode;
      if (n != "td") {
          if (!p) { return false; } else { return findThisCell(p as HTMLElement); }
      } else {
        const x = node.dataset.sampleX || "";
        const y = node.dataset.sampleY || "";
        if ((x == settings.x.toString()) && (y == settings.y.toString())) {
          return true;
        } else {
          if (!p) { return false; } else { return findThisCell(p as HTMLElement); }
        }
      }
    }

    const found = findThisCell(event.target as HTMLElement);
    if (!found) {
      if ((inputValue == settings.value) || (validationState != InputValidationState.Succeeded)) {
        reset();
      } else {
        save();
      }
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  }


  // Deal with changes to the input value.
  // We trigger a short delay before searching, and in the meantime
  // we set the UI to show no matches and no selection.
  function inputChanged(value: string) {
    if (debounceTimer) { clearTimeout(debounceTimer); }
    setDebounceTimer(setTimeout(() => inputCompleted(value), settings.debounceTime || 150));
    setInputValue(value);
    setTypingState(InputTypingState.IsTyping);
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
  }


  function inputCompleted(value: string) {
    setTypingState(InputTypingState.StoppedTyping);
    if (value != settings.value) {
      setOperationInProgress(true);
      const result = settings.cellFunctions.validator(settings.x, settings.y, value);
      gotValidationResult(value, result);
    }
  }


  function save() {
    setOperationInProgress(true);
    // If the save is successful we expect the user of this component to change "value" in the settings,
    // which will effectively reset the control.
    const result = settings.cellFunctions.save(settings.x, settings.y, inputValue);
//    setCellActivated(false);
    if (result.status == CellValidationStatus.Success) {
//      setCellActivated(false);
      setValidationState(InputValidationState.NotTriggered);
      setValidationMessage(null);
    } else {
      reset();
    }
  }


  function gotValidationResult(value: string, result: CellValidationResult) {
    setTypingState(InputTypingState.NotTyping);
    setOperationInProgress(false);
    switch(result.status ?? CellValidationStatus.Success) {
      case CellValidationStatus.Success:
      case CellValidationStatus.Failure:
        setValidationState(InputValidationState.Failed);
        setValidationMessage(result.message ?? "Invalid value");
        break;
    }
  }


  function reset() {
//    setCellActivated(false);
    setInputValue(settings.value);
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
  }


  function inputOnFocus() {
//    setValidationState(InputValidationState.NotTriggered);
//    setValidationMessage(null);
//    inputCompleted(inputValue);
  }


  function inputOnBlur() {
    setJustBlurred(true);
  }
  

  var inputColor = "";
  var statusIcon: JSX.Element | null = null;
  var help: JSX.Element | null = null;
  var showSaveButton: boolean = false;
  var showCancelButton: boolean = false;

  // Only show decoration if the value has been edited (differs from value specified in settings)
  if (inputValue != settings.value) {

    help = (<p className="help">Press Enter to save. Press Esc to cancel.</p>);

    // If an operation is in progress then we don't show any decoration.
    if (!operationInProgress) {
      if (validationMessage) {
        if (validationState == InputValidationState.Failed) {
          help = (<p className="help is-danger">{ validationMessage }</p>);
        } else {
          help = (<p className="help">{ validationMessage }</p>);
        }
      }

      if (validationState == InputValidationState.Failed) {
        inputColor = "is-danger";
      }

      // Even if the value is different, we will only show the controls
      // when the user has finished typing (giving the validation time to run.)
      if (typingState == InputTypingState.NotTyping) {
        showCancelButton = true;

        if (validationState == InputValidationState.Succeeded) {
          showSaveButton = true;
        }
      }
    }
  }

  const cellClass = classNames("samplecell", justActivated ? "editing" : "", settings.isUnused ? "unused" : "", inputColor);
  const helpClass = classNames("notify", help ? "disclosed" : "");

  return (
    <td key={ settings.elementKey }
        data-sample-x={settings.x}
        data-sample-y={settings.y}
        data-sample-unused={settings.isUnused || 0}
        className={ cellClass }
    >
      <div>
        <div className="value" ref={ valueRef }>{ settings.isUnused ? (<span>&nbsp;</span>) : settings.value }</div>
        <div className="cellTableInput">
          <input type="text"
            placeholder={ "Enter value" }
            onChange={ (event) => {
              inputChanged(event.target.value)
            } }
            autoCorrect="off"
            value={ inputValue }
            ref={ inputRef }
            onKeyDown={ inputOnKeyDown }
            onFocus={ inputOnFocus }
            onBlur={ () => {
              // The onblur event may happen because of some external event.
              // Wait a bit to give precedence to that event in that case.
              setTimeout( inputOnBlur, 200);
            } }
            style={ {width: lastMinimumWidth} }
          />
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


export { SampleCell, CellValidationStatus }
export type { CellFunctions, CellValidationResult  }
