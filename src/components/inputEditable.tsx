import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SizeProp } from '@fortawesome/fontawesome-svg-core';
import { faExclamationTriangle, faSpinner, faQuestion, faCheck, faX } from '@fortawesome/free-solid-svg-icons';
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
  addedStyle?: string;
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


function InputEditable(settings: InputEditableParameters) {

  // Just a small helper function to concetenate CSS class names
  function classNames(...names:(string|null|undefined)[]): string {
    return names.filter((name) => (name !== undefined) && (name !== null) && (name.length > 0)).join(" "); 
  }

  // Value in the DOM input element
  const [inputValue, setInputValue] = useState<string>(settings.value);
  // Which item in the dropdown is currently selected, if any, numbered from 0 starting at the top
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


  // This handles keyboard-based selection in the dropdown.
  // Changes to the input value are handled in inputChanged.
  function inputOnKeyDown(event:React.KeyboardEvent<HTMLInputElement>) {
    if (event.key == "Escape") {
      reset();
      // Defocus?
    } else if (event.key == "Enter") {
      if (inputValue == settings.value) {
        reset();
      } else {
        save();
      }
    }
  }

  
  // Deal with changes to the input value.
  // We trigger a short delay before searching, and in the meantime
  // we set the UI to show no matches and no selection.
  function inputChanged(value:string) {
    if (debounceTimer) { clearTimeout(debounceTimer); }
    setDebounceTimer(setTimeout(() => inputCompleted(value), settings.debounceTime || 150));
    setInputValue(value);
    setTypingState(InputTypingState.IsTyping);
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
  }


  function inputCompleted(value:string) {
    setTypingState(InputTypingState.StoppedTyping);
    setOperationInProgress(true);
    settings.editFunctions.validator(value).then((result) => gotValidationResult(value, result));
  }


  function save() {
    setOperationInProgress(true);
    // If the save is successful we expect the user of this component to change "value" in the settings,
    // which will effectively reset the control.
    settings.editFunctions.submit(inputValue).then((result) => gotValidationResult(inputValue, result));
  }


  function gotValidationResult(value:string, result: ValidationResult) {
    setTypingState(InputTypingState.NotTyping);
    switch(result.status ?? ValidationStatus.Success) {
      case ValidationStatus.Success:
      case ValidationStatus.SuccessWithWarning:
        setValidationState(InputValidationState.Succeeded);
        setValidationMessage(result.message || null);
        break;
      case ValidationStatus.Failure:
        setValidationState(InputValidationState.Failed);
        setValidationMessage(result.message ?? "Error in search");
        break;
    }
    setOperationInProgress(false);
  }


  function reset() {
    setInputValue(settings.value);
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
  }


  function inputOnFocus() {
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
    inputCompleted(inputValue);
  }


  function inputOnBlur() {
    setJustBlurred(true);
  }
  

  var inputColor = "";
  var statusIcon: JSX.Element | null = null;
  var inputIcon: JSX.Element | null = settings.icon || null;
  var help: JSX.Element | null = null;
  var saveButton: JSX.Element | null = null;
  var cancelButton: JSX.Element | null = null;
  
  if (operationInProgress) {
    statusIcon = (<FontAwesomeIcon icon={faSpinner} spin={true} />); 

  } else if ((typingState == InputTypingState.StoppedTyping) &&
             (validationState == InputValidationState.NotTriggered)) {
    statusIcon = (<FontAwesomeIcon icon={faQuestion} />);
    inputIcon = null;

  } else {

    cancelButton = (
      <div className="control">
        <button className="button" onClick={ () => { reset() }}>
          <span className={ classNames( "icon", "is-right", "is-danger", "is-small") }>
            <FontAwesomeIcon icon={faX} />
          </span>
        </button>
      </div>
    );

    if (validationState == InputValidationState.Failed) {
      inputColor = "is-danger";
      statusIcon = (<FontAwesomeIcon icon={faExclamationTriangle} color="darkred" />);
      if ((inputValue != settings.value) && settings.showHelp && validationMessage) {
        help = (<p className="help is-danger">{ validationMessage }</p>);
      }
    } else if (validationState == InputValidationState.Succeeded) {
      statusIcon = (<FontAwesomeIcon icon={faCheck} />);

      saveButton = (
        <div className="control">
          <button className="button" onClick={ () => { save() }}>
            <span className={ classNames( "icon", "is-right", "is-success", "is-small") }>
              <FontAwesomeIcon icon={faCheck} />
            </span>
          </button>
        </div>
      );
  
    } else {
      if ((inputValue != settings.value) && settings.showHelp) {
        if (settings.isTextArea) {
          help = (<p className="help">Press Ctrl + Enter to save. Press Ctrl + Esc to cancel.</p>);
        } else {
          help = (<p className="help">Press Enter to save. Press Esc to cancel.</p>);
        }
      }
    }
  }

  var helpSection: JSX.Element | null = null;
  if (help) {
    helpSection = (
      <div className="inputeditable-notify disclosed"> 
        <div className="inputeditable-notify-content">
          { help }
        </div>
      </div>
    );
  }

  const controlClass = classNames("control", "is-expanded", inputIcon ? "has-icons-left" : "", statusIcon ? "has-icons-right" : "");
  const inputClass = classNames("input", inputColor, settings.inputSize || "is-normal");

  return (
    <div className={ classNames("editable", "field", settings.addedStyle) }>
      { (settings.label && (
          <label className="label">{ settings.label }</label>)
      ) }
      <div className="field-body">
      </div>
    </div>
  )
}


export { InputEditable, ValidationStatus }
export type { EditFunctions, ValidationResult  }
