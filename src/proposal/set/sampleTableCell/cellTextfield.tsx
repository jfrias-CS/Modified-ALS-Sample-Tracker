import React, { useState, useEffect, useRef } from 'react';
import 'bulma/css/bulma.min.css';

import { CellActivationStatus, CellValidationStatus, CellHelpStatus, CellHelpMessage, CellValidationResult, CellSubcomponentParameters } from './cellDto.ts';


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

  const inputRef = useRef<HTMLTextAreaElement>(null);


  // This handles keyboard-based navigation or actions in the input field.
  // Changes to the input value are handled in inputOnChange.
  function inputOnKeyDown(event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    var didMove = settings.cellFunctions.testKeyForMovement(event, true);

    switch (event.key) {
      case "Escape":
        reset();
        break;
      case "Enter":
        // In the case of "Enter" we always want to save,
        // whether we've successfully moved or not.
        didMove = true;
        // We also don't ever want carriage returns in our parameters,
        // so we're going to consistently prevent the default.
        event.preventDefault();
        break;
    }

    // If a key was entered that allowed movement, we are assuming that the
    // key is not one that can change the effective value in the input element,
    // so we're okay with relying on the value of validationState even though we
    // haven't re-validated based on the effect of this keypress.
    if (didMove) {
      if (inputValue == settings.value) {
        reset();
      //} else if (validationState == InputValidationState.Succeeded) {
      // We used to only save if the value was valid.  Now we accept invalid values and alert the user to correct them.
      } else {
        save();
      }
    }
  }


  // We want to give the input element focus when we enter editing mode,
  // but we can only do so after it's been revealed on the page by removing
  // "display:none" from the parent div.  Trying to .focus() on an element that
  // isn't being displayed does nothing.  So we watch justActivated for a delayed effect. 
  useEffect(() => {
    if (settings.activationStatus != CellActivationStatus.Inactive) {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(0, inputRef.current.value.length)
      }
    }
  }, [settings.activationStatus]);


  // Deal with changes to the input value.
  // We trigger a short delay before validating,
  // and in the meantime we hide the feedback panel.
  function inputOnChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const value = event.target.value;
    if (debounceTimer) { clearTimeout(debounceTimer); }
    setDebounceTimer(setTimeout(() => inputCompleted(value), 130));
    if (!settings.isReadOnly) {
      setInputValue(value);
    }
    setTypingState(InputTypingState.IsTyping);
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
  }


  function inputCompleted(value: string) {
    setTypingState(InputTypingState.StoppedTyping);
    value = value.replace(/\u202F|\u00A0/g, ' ');
    value = value.replace(/\n/g, ' ');
    value = value.trim();
    const result = settings.cellFunctions.validate(value);
    gotValidationResult(result);
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
    if (settings.isReadOnly) {
      reset();
    } else {
      setValidationState(InputValidationState.NotTriggered);
      setValidationMessage(null);
      const result = settings.cellFunctions.save(inputValue);
      if (result.status != CellValidationStatus.Success) {
        reset();
      }
    }
  }


  function reset() {
    setInputValue(settings.value);
    setValidationState(InputValidationState.NotTriggered);
  }


  function inputOnFocus() {
    inputCompleted(settings.value);
  }


  function inputOnBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>) {
    // We used to only save if the value was valid.  Now we accept invalid values and alert the user to correct them.
    if (inputValue != settings.value) {
      save();
    } else {
      reset();
    }
    settings.cellFunctions.close();
  }

  
  // If any relevant state changes, update the pop-under help for the cell.
  useEffect(() => {
    var help: CellHelpMessage[] = [];
    if (typingState != InputTypingState.IsTyping) {
      // Show a description of the value, if available, but only if the user isn't typing.
      if (settings.description) {
        help.push({ status: CellHelpStatus.Info, message: settings.description });
      }

      if (validationMessage) {
        if (validationState == InputValidationState.Failed) {
          help.push({ status: CellHelpStatus.Danger, message: validationMessage });
        } else {
          help.push({ status: CellHelpStatus.Normal, message: validationMessage });
        }
      } else if (inputValue != settings.value) {  
        help.push({ status: CellHelpStatus.Normal, message: "Press Enter to save. Press Esc to cancel." });
      }
    }

    settings.cellFunctions.setHelp(help);
  }, [typingState, inputValue, validationMessage, validationState]);

  return (
        <textarea
          placeholder={ "Enter value" }
          onChange={ inputOnChange }
          autoCorrect="off"
          value={ inputValue }
          ref={ inputRef }
          onKeyDown={ inputOnKeyDown }
          onFocus={ inputOnFocus }
          onBlur={ inputOnBlur }
          style={ {
              height: settings.lastKnownHeight || "unset", 
              width: settings.lastKnownWidth || "unset"
            } }
        />
  );

/*
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
            style={ {width: settings.lastKnownWidth} }
          />
  );
  */
}


export { CellTextfield }
