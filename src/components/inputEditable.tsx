import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SizeProp } from '@fortawesome/fontawesome-svg-core';
import { faExclamationTriangle, faSpinner, faCheck, faX } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import './inputEditable.css';


// Internal state tracking
enum ValidationStatus { Success, SuccessWithWarning, Failure };

interface ValidationResult {
  status?: ValidationStatus;
  message?: string | null;
}

type Validator = (inputString: string) => Promise<ValidationResult>;


interface EditFunctions {
  validator: Validator;
  submit: Validator;
}


// Settings passed in with the React component
interface InputEditableParameters {
  elementId: string;
  addedClass?: string;
  icon?: JSX.Element;
  inputSize?: string;
  iconSize?: SizeProp;
  placeholder?: string;
  value: string;
  showHelp?: boolean;
  label?: string;
  isReadOnly?: boolean;
  isTextArea?: boolean;
  textAreaRows?: number;
  debounceTime?: number;
  editFunctions: EditFunctions;
}


// Internal state tracking
enum InputTypingState { NotTyping, IsTyping, StoppedTyping };
enum InputValidationState { NotTriggered, Succeeded, Failed };


// Just a small helper function to concatenate CSS class names
function classNames(...names:(string|null|undefined)[]): string {
  return names.filter((name) => (name !== undefined) && (name !== null) && (name.length > 0)).join(" "); 
}


function InputEditable(settings: InputEditableParameters) {

  // Value in the DOM input element
  const [inputValue, setInputValue] = useState<string>(settings.value);
  const [typingState, setTypingState] = useState<InputTypingState>(InputTypingState.NotTyping);
  const [validationState, setValidationState] = useState<InputValidationState>(InputValidationState.NotTriggered);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [operationInProgress, setOperationInProgress] = useState<boolean>(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [justBlurred, setJustBlurred] = useState<boolean>(false);


  // Triggered one time only, whenever the input is blurred.
  // Used to ensure the latest state values are being validated (instead of old ones),
  // after a click event on a pulldown item.
  useEffect(() => {
    if (!justBlurred) { return; }
    setJustBlurred(false);

//    validate();
  }, [justBlurred]);


  // This handles keyboard-based actions in the input field.
  // Changes to the input value are handled in inputOnChange.
  function inputOnKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key == "Escape") {
      reset();
      // Defocus?
    } else if (event.key == "Enter") {
      if (inputValue == settings.value) {
        reset();
      } else if (validationState == InputValidationState.Succeeded) {
        save();
      }
    }
  }

  
  // Deal with changes to the input value.
  // We trigger a short delay before validating.
  function inputOnChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
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
      settings.editFunctions.validator(value).then((result) => gotValidationResult(value, result));
    }
  }


  function save() {
    setOperationInProgress(true);
    // If the save is successful we expect the user of this component to change "value" in the settings,
    // which will effectively reset the control.
    settings.editFunctions.submit(inputValue).then((result) => gotValidationResult(inputValue, result));
  }


  function gotValidationResult(value: string, result: ValidationResult) {
    setTypingState(InputTypingState.NotTyping);
    setOperationInProgress(false);
    switch(result.status ?? ValidationStatus.Success) {
      case ValidationStatus.Success:
      case ValidationStatus.SuccessWithWarning:
        setValidationState(InputValidationState.Succeeded);
        setValidationMessage(result.message || null);
        break;
      case ValidationStatus.Failure:
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
  var inputIcon: JSX.Element | null = settings.icon || null;
  var help: JSX.Element | null = null;
  var showSaveButton: boolean = false;
  var showCancelButton: boolean = false;

  // Only show decoration if the value has been edited (differs from value specified in settings)
  if (inputValue != settings.value) {

    if (settings.isTextArea) {
      help = (<p className="help">Press Ctrl + Enter to save. Press Ctrl + Esc to cancel.</p>);
    } else {
      help = (<p className="help">Press Enter to save. Press Esc to cancel.</p>);
    }

    // If an operation is in progress (validation or saving) then only show the wait spinner.
    // No other controls/feedback are relevant.
    if (operationInProgress) {
      statusIcon = (<FontAwesomeIcon icon={faSpinner} spin={true} />); 

    } else {

      if (validationMessage) {
        if (validationState == InputValidationState.Failed) {
          help = (<p className="help is-danger">{ validationMessage }</p>);
        } else {
          help = (<p className="help">{ validationMessage }</p>);
        }
      }

      if (validationState == InputValidationState.Failed) {
        inputColor = "is-danger";
        statusIcon = (<FontAwesomeIcon icon={faExclamationTriangle} color="darkred" />);
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

  const controlClass = classNames("control", "is-expanded", inputIcon ? "has-icons-left" : "", statusIcon ? "has-icons-right" : "");
  const inputClass = classNames("input", inputColor, settings.inputSize || "is-normal");

  return (
    <div className={ classNames("editable", "field", settings.addedClass) }>
      { (settings.label && (
          <label className="label">{ settings.label }</label>)
      ) }
      <div className="field-body">
        <div className="field is-expanded">
          <div className="field has-addons">
            <div className={ controlClass }>
              <input type="text"
                className={ inputClass }
                id={ "debouncer-editable-" + (settings.elementId || "default") }
                placeholder={ settings.placeholder || "Enter value" }
                value={ inputValue }
                readOnly={ settings.isReadOnly }
                onKeyDown={ inputOnKeyDown }
                onChange={ inputOnChange }
                autoCorrect="off"

                aria-haspopup="listbox"

                onFocus={ inputOnFocus }
                onBlur={ () => {
                  // The onblur event may happen because of some external event.
                  // Wait a bit to give precedence to that event in that case.
                  setTimeout( inputOnBlur, 200);
                } }
              />
              { (inputIcon && (
                  <span className={ classNames( "icon", "is-left", settings.iconSize) }>
                    { inputIcon }
                  </span>)
              ) }
              { (statusIcon && (
                  <span className={ classNames( "icon", "is-right", settings.iconSize) }>
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
          { (help && settings.showHelp) && (
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


export { InputEditable, ValidationStatus }
export type { EditFunctions, ValidationResult  }
