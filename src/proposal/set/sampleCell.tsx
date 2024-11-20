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

  const ref = useRef<HTMLTableCellElement>(null);
  const lastHtml = useRef<string>('');


  // Triggered one time only, whenever the input is blurred.
  // Used to ensure the latest state values are being validated (instead of old ones),
  // after a click event on a pulldown item.
  useEffect(() => {
    if (!justBlurred) { return; }
    setJustBlurred(false);
    console.log(`Blurred ${settings.x} ${settings.y}`);
//    validate();
  }, [justBlurred]);


  // This handles keyboard-based selection in the dropdown.
  // Changes to the input value are handled in inputChanged.
  function inputOnKeyDown(event: React.KeyboardEvent<HTMLTableCellElement>) {
    if (event.key == "Escape") {
      reset();
      // Defocus
      if (ref.current) {
        ref.current.blur();
      }
    } else if (event.key == "Enter") {
//      if (inputValue == settings.value) {
        reset();
//      } else if (validationState == InputValidationState.Succeeded) {
//        save();
//      }
    } else {
      var curText = ref.current?.innerText || '';
      curText = curText.replace(/&nbsp;|\u202F|\u00A0/g, ' ');
      curText = curText.replace(/\n/g, '');
      if (curText !== lastHtml.current) {
        inputChanged(curText);
      }
      lastHtml.current = inputValue;
    }
  }


  function onInput(event: React.FormEvent<HTMLTableCellElement>) {
    var curText = ref.current?.innerText || '';
    curText = curText.replace(/&nbsp;|\u202F|\u00A0/g, ' ');
    curText = curText.replace(/\n/g, '');
    if (curText !== lastHtml.current) {
      inputChanged(curText);
    }
    lastHtml.current = inputValue;
  };


  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerText === inputValue) return;
    ref.current.innerText = inputValue;
  }, [inputValue]);


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
    gotValidationResult(inputValue, result);
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

  const controlClass = classNames("control", "is-expanded", statusIcon ? "has-icons-right" : "");
  const inputClass = classNames("input", inputColor, "is-normal");


  return (
    <td key={ settings.elementKey }
        ref={ref}
        data-sample-x={settings.x}
        data-sample-y={settings.y}
        tabIndex={settings.x+(50*settings.y)}
        data-sample-unused={settings.isUnused || 0}
        autoCorrect="off"
        onKeyDown={ inputOnKeyDown }
        onFocus={ inputOnFocus }
        onBlur={ () => {
          // The onblur event may happen because one of the matched items has been clicked.
          // Wait a bit to give precedence to the click event in that case.
          setTimeout( inputOnBlur, 200);
        } }
    ></td>
  );

  return (
    <td key={ settings.elementKey } className="notused"><div><div>&nbsp;</div></div></td>
  );

  return (
    <div className={ classNames("editable", "field") }>
      <div className="field-body">
        <div className="field is-expanded">
          <div className="field has-addons">
            <div className={ controlClass }>
              <input type="text"
                className={ inputClass }
                id={ "debouncer-editable-" + (settings.elementKey || "default") }
                autoCorrect="off"

                aria-haspopup="listbox"

                value={ inputValue }
                onFocus={ inputOnFocus }
                onBlur={ () => {
                  // The onblur event may happen because one of the matched items has been clicked.
                  // Wait a bit to give precedence to the click event in that case.
                  setTimeout( inputOnBlur, 200);
                } }
              />
              { (statusIcon && (
                  <span className={ classNames( "icon", "is-right" ) }>
                    { statusIcon }
                  </span>)
              ) }
            </div>
            { showCancelButton && (
                <div className="control">
                  <button className="button has-background-danger-dark" onClick={ () => { reset() }}>
                    <span className={ classNames( "icon", "is-right", "is-small") }>
                      <FontAwesomeIcon icon={faX} />
                    </span>
                  </button>
                </div>
              )
            }
            { showSaveButton && (
              <div className="control">
                <button className="button has-background-primary-dark" onClick={ () => { save() }}>
                  <span className={ classNames( "icon", "is-right", "is-small") }>
                    <FontAwesomeIcon icon={faCheck} color="lightgreen" />
                  </span>
                </button>
              </div>

              )
            }
          </div>
          { help && (
            <div className="inputeditable-notify disclosed"> 
              <div className="inputeditable-notify-content">
                { help }
              </div>
            </div>
            )
          }
        </div>
      </div>
    </div>
  )
}


export { SampleCell, CellValidationStatus }
export type { CellFunctions, CellValidationResult  }
