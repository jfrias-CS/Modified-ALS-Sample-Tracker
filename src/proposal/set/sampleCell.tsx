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
type Navigation = (x: number, y: number) => CellValidationStatus;


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
  key: string;
  x: number;
  y: number;
  isActivated: boolean;
  value: string;
  description?: string;
  isUnused?: boolean;
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
  const [typingState, setTypingState] = useState<InputTypingState>(InputTypingState.NotTyping);
  const [validationState, setValidationState] = useState<InputValidationState>(InputValidationState.NotTriggered);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [justActivated, setJustActivated] = useState<boolean>(settings.isActivated);
  const [lastMinimumWidth, setLastMinimumWidth] = useState<string>("23px");

  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);


  // This handles keyboard-based navigation or actions in the input field.
  // Changes to the input value are handled in inputOnChange.
  function inputOnKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    var didMove: CellValidationStatus = CellValidationStatus.Failure;

    switch (event.key) {
      case "Escape":
        reset();
        // Defocus
        if (inputRef.current) {
          inputRef.current.blur();
        }
        break;
      case "Enter":
        settings.cellFunctions.down(settings.x, settings.y);
        // In the case of "Enter" we always want to save,
        // whether we've successfully moved or not.
        didMove = CellValidationStatus.Success;
        break;
      case "ArrowDown":
        didMove = settings.cellFunctions.down(settings.x, settings.y);
        break;
      case "ArrowUp":
        didMove = settings.cellFunctions.up(settings.x, settings.y);
        break;
      case "Tab":
        if (event.shiftKey) {
          didMove = settings.cellFunctions.left(settings.x, settings.y);
        } else {
          didMove = settings.cellFunctions.right(settings.x, settings.y);
        }
        if (didMove == CellValidationStatus.Success) {
          event.preventDefault();
        }
        break;
    }

    if (didMove == CellValidationStatus.Success) {
      if (inputValue == settings.value) {
        reset();
      } else if (validationState == InputValidationState.Succeeded) {
        save();
      }
    }
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
    //    document.addEventListener("mousedown", clickedElsewhere)
    return () => {
//      document.removeEventListener("mousedown", clickedElsewhere)
    };
  }, [settings.isActivated]);


  // We want to give the input element focus when we enter editing mode,
  // but we can only do so after it's been revealed on the page by removing
  // "display:none" from the parent div.  Trying to .focus() on an element that
  // isn't being displayed does nothing.  So we watch justActivated for a delayed effect. 
  useEffect(() => {
    if (justActivated) {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(0, inputRef.current.value.length)
      }
    }
  }, [justActivated]);


  // Deal with changes to the input value.
  // We trigger a short delay before validating,
  // and in the meantime we hide the feedback panel.
  function inputOnChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    if (debounceTimer) { clearTimeout(debounceTimer); }
    setDebounceTimer(setTimeout(() => inputCompleted(value), 100));
    setInputValue(value);
    setTypingState(InputTypingState.IsTyping);
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
  }


  function inputCompleted(value: string) {
    setTypingState(InputTypingState.StoppedTyping);
    value = value.replace(/&nbsp;|\u202F|\u00A0/g, ' ');
    value = value.replace(/\n/g, '');
    value = value.trim();
    if (value != settings.value) {
      const result = settings.cellFunctions.validator(settings.x, settings.y, value);
      gotValidationResult(result);
    }
  }


  function gotValidationResult(result: CellValidationResult) {
    setTypingState(InputTypingState.NotTyping);
    if (result.status == CellValidationStatus.Success) {
      setValidationState(InputValidationState.Succeeded);
      setValidationMessage(null);
    } else if (result.status == CellValidationStatus.Failure) {
      setValidationState(InputValidationState.Failed);
      setValidationMessage(result.message ?? "Invalid value");
    }
  }


  function save() {
    // If the save is successful we expect settings.value to change
    // which will update the control.
    var value = inputValue.replace(/&nbsp;|\u202F|\u00A0/g, ' ');
    value = value.replace(/\n/g, '');
    value = value.trim();
    const result = settings.cellFunctions.save(settings.x, settings.y, value);
    if (result.status == CellValidationStatus.Success) {
      setValidationState(InputValidationState.NotTriggered);
      setValidationMessage(null);
    } else {
      reset();
    }
  }


  function reset() {
    setInputValue(settings.value);
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
  }


  function inputOnFocus() {
//    setValidationState(InputValidationState.NotTriggered);
//    setValidationMessage(null);
//    inputCompleted(inputValue);
  }


  function inputOnBlur(e: React.FocusEvent<HTMLInputElement, Element>) {
    if ((validationState == InputValidationState.Succeeded) && (inputValue != settings.value)) {
      save();
    } else {
      reset();
    }
    console.log(`Blurred ${settings.x} ${settings.y}`);
  }
  

  var inputColor = "";
  var help: JSX.Element | null = null;

  if (typingState != InputTypingState.IsTyping) {

    // Show a description of the value, if available, but only if the user isn't typing.
    help = settings.description ? (<p className="help is-info">{ settings.description }</p>) : null;

    // Only show validation if the value has been edited (differs from value specified in settings)
    if (inputValue != settings.value) {

      help = (<p className="help">Press Enter to save. Press Esc to cancel.</p>);
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
    }
  }

  const cellClass = classNames("samplecell", justActivated ? "editing" : "", settings.isUnused ? "unused" : "", inputColor);
  const helpClass = classNames("notify", help ? "disclosed" : "");

  return (
    <td key={ settings.key }
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
            onChange={ inputOnChange }
            autoCorrect="off"
            value={ inputValue }
            ref={ inputRef }
            onKeyDown={ inputOnKeyDown }
            onFocus={ inputOnFocus }
            onBlur={ inputOnBlur }
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
