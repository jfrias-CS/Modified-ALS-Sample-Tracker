import React, { useState, useEffect, useRef } from 'react';
import 'bulma/css/bulma.min.css';

import { CellValidationStatus, CellHelpStatus, CellHelpMessage, CellValidationResult, CellSubcomponentFunctions } from './cellDto.ts';


// Settings passed in with the React component
interface CellSubcomponentParameters {
  isActivated: boolean;
  value: string;
  description?: string;
  lastMinimumWidth: string;
  cellFunctions: CellSubcomponentFunctions;
}


// Internal state tracking
enum InputTypingState { NotTyping, IsTyping, StoppedTyping };
enum InputValidationState { NotTriggered, Succeeded, Failed };


function CellTextfield(settings: CellSubcomponentParameters) {

  // Value in the DOM input element
  const [inputValue, setInputValue] = useState<string>(settings.value);
  const [typingState, setTypingState] = useState<InputTypingState>(InputTypingState.NotTyping);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<InputValidationState>(InputValidationState.NotTriggered);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);


  // This handles keyboard-based navigation or actions in the input field.
  // Changes to the input value are handled in inputOnChange.
  function inputOnKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    var didMove = settings.cellFunctions.testKeyForMovement(event, true);

    switch (event.key) {
      case "Escape":
        reset();
        // Defocus
        if (inputRef.current) {
          inputRef.current.blur();
        }
        break;
      case "Enter":
        // In the case of "Enter" we always want to save,
        // whether we've successfully moved or not.
        didMove = true;
        break;
    }

    if (didMove) {
      if (inputValue == settings.value) {
        reset();
      } else if (validationState == InputValidationState.Succeeded) {
        save();
      }
    }
  }


  // We want to give the input element focus when we enter editing mode,
  // but we can only do so after it's been revealed on the page by removing
  // "display:none" from the parent div.  Trying to .focus() on an element that
  // isn't being displayed does nothing.  So we watch justActivated for a delayed effect. 
  useEffect(() => {
    if (settings.isActivated) {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(0, inputRef.current.value.length)
      }
    }
  }, [settings.isActivated]);


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
      const result = settings.cellFunctions.validate(value);
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
    const result = settings.cellFunctions.save(inputValue);
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
    console.log(`Blurred.`);
  }
  

  // If any relevant state changes, update the pop-under help for the cell.
  useEffect(() => {
    var help: CellHelpMessage = { status: CellHelpStatus.Hide };
    if (typingState != InputTypingState.IsTyping) {

      // Show a description of the value, if available, but only if the user isn't typing.
      if (settings.description) {
        help = { status: CellHelpStatus.Info, message: settings.description };
      }
  
      // Only show validation if the value has been edited (differs from value specified in settings)
      if (inputValue != settings.value) {
  
        help = { status: CellHelpStatus.Normal, message: "Press Enter to save. Press Esc to cancel." };
        if (validationMessage) {
          if (validationState == InputValidationState.Failed) {
            help = { status: CellHelpStatus.Danger, message: validationMessage };
          } else {
            help = { status: CellHelpStatus.Normal, message: validationMessage };
          }
        }
      }
    }
    settings.cellFunctions.setHelp(help);
  }, [typingState, inputValue, validationMessage, validationState]);


  return (
          <input type="text"
            placeholder={ "Enter value" }
            onChange={ inputOnChange }
            autoCorrect="off"
            value={ inputValue }
            ref={ inputRef }
            onKeyDown={ inputOnKeyDown }
            onFocus={ inputOnFocus }
            onBlur={ inputOnBlur }
            style={ {width: settings.lastMinimumWidth} }
          />
  );
}


export { CellTextfield }
