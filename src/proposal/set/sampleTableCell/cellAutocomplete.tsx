import React, { useState, useEffect, useRef } from 'react';
import 'bulma/css/bulma.min.css';
import './cellAutocomplete.css';

import { ParameterChoice } from '../../../scanTypes.ts';
import { CellValidationStatus, CellHelpStatus, CellHelpMessage, CellValidationResult, CellSubcomponentParameters } from './cellDto.ts';
import { highlightSearchTermsInString } from "../../../components/utils.tsx";


interface CellAutocompleteParameters extends CellSubcomponentParameters {
  choices: ParameterChoice[];
}


// Status tracking
enum SelectingStatus { Success, Failure };


function CellAutocomplete(settings: CellAutocompleteParameters) {

    // Turn the current value into a matching ParameterChoice (if any)
  var currentParameter:ParameterChoice | null = null;
  if ((settings.value !== null) && (settings.value !== undefined)) {
    currentParameter = settings.choices.find((s) => s.name == settings.value) || null;
  }

  // Value in the DOM input element
  const [inputValue, setInputValue] = useState<string>(settings.value);
  // Which item in the dropdown is currently selected, if any, numbered from 0 starting at the top
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(true);
  const [matchedItems, setMatchedItems] = useState<ParameterChoice[]>([]);
  const [selectedItem, setSelectedItem] = useState<ParameterChoice | null>(currentParameter);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [justBlurred, setJustBlurred] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);


  // When this control is first focused, there is no autocomplete pulldown
  // visible, so we want to show the description of the parameter.
  useEffect(() => {
    if (settings.triggerFocus) {
      setShowHelp(true);
    }
  }, [settings.triggerFocus]);


  // If any relevant state changes, update the pop-under help for the cell.
  useEffect(() => {
    var help: CellHelpMessage = { status: CellHelpStatus.Hide };
    // Show a description of the value, if available, but only if the user isn't typing.
    if (showHelp) {
      help = { status: CellHelpStatus.Info, message: settings.description };
    }
    settings.cellFunctions.setHelp(help);
  }, [showHelp]);


  function isDropdownActive(): boolean {
    return  (selectedItem == null) &&
            (matchedItems.length > 0)
  }


  // Triggered one time only, whenever the input is blurred.
  // Used to ensure the latest state values are being validated (instead of old ones),
  // after a click event on a pulldown item.
  useEffect(() => {
    if (!justBlurred) { return; }
    setJustBlurred(false);
    // We rely on this happening after a timer, so a click-based selection
    // has time to take effect first.
    // This way, a blur that happens because the user clicked on an item in
    // the pulldown won't cause this call to reset the form to the previous value.
    reset();
  }, [justBlurred]);


  // We want to give the input element focus, and setting "autofocus" on the
  // element would do that once, but we also want to select the entire contents
  // of the input box afterwards.
  useEffect(() => {
    if (settings.triggerFocus) {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(0, inputRef.current.value.length)
      }
    }
  }, [settings.triggerFocus]);


  // This handles keyboard-based selection in the dropdown.
  // Changes to the input value are handled in inputChanged.
  function inputOnKeyDown(event:React.KeyboardEvent<HTMLInputElement>) {

    var move = 0;
    if ( isDropdownActive() ) {
      if (event.key == "Escape") {
        reset();
      } else if (event.key == "ArrowDown") {
        move = 1;
      } else if (event.key == "ArrowUp") {
        move = -1;
      } else if ((event.key == "Enter") && (focusedItemIndex !== null)) {
        selectItem(matchedItems[focusedItemIndex]);
      }
    }

    if (move != 0) {
      event.preventDefault();
      const itemsLength = matchedItems.length;
      var newIndex;
      if (focusedItemIndex !== null) {
        newIndex = focusedItemIndex + move;
      } else if (move > 0) {
        newIndex = 0;
      } else {
        newIndex = itemsLength - 1;
      }
      if (newIndex >= itemsLength) {
        newIndex = 0;
      } else if (newIndex < 0) {
        newIndex = itemsLength - 1;
      }
      setFocusedItemIndex( newIndex );
    } else {
      // If an up or down arrow did not result in navigating the search dropdown,
      // it's sent here, where we see if it triggers navigation in the table.
      settings.cellFunctions.testKeyForMovement(event, true);
      // Since we've received a key that didn't trigger navigation in the search
      // dropdown, we'll assume it changed the value of the search box, which would
      // require showing the search pulldown.  That means we need to get the help box
      // out of the way.
      setShowHelp(false);
    }
  }

  
  // Deal with changes to the input value.
  // We trigger a short delay before searching, and in the meantime
  // we set the UI to show no matches and no selection.
  function inputChanged(value:string) {
    if (debounceTimer) { clearTimeout(debounceTimer); }
    setDebounceTimer(setTimeout(() => inputCompleted(value), 150));
    setInputValue(value);
    setMatchedItems([]);
    setFocusedItemIndex(null);
    setSelectedItem(null);
  }


  function inputCompleted(value:string) {

    const trimmedContent = value.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');

    const searchStringLower = trimmedContent.toLowerCase();
    const matches = settings.choices.filter((s) =>
                      s.name.toLowerCase().includes(searchStringLower) ||
                      s.description.toLowerCase().includes(searchStringLower));
  
    setMatchedItems(matches);
    if (matches.length == 1) {
      setFocusedItemIndex(0);
    } else {
      setFocusedItemIndex(null);
    }
  }


  function reset() {
    setSelectedItem(currentParameter);
    setMatchedItems([]);
    setFocusedItemIndex(null);
    if (debounceTimer) { clearTimeout(debounceTimer); }
    if (currentParameter) {
      setInputValue(currentParameter.name);
    } else {
      setInputValue("");
    }
  }

  
  function selectItem(item: ParameterChoice): SelectingStatus {
    // If the save is successful we expect settings.value to change
    // which will update the control.
    const result = settings.cellFunctions.save(item.name);
    if (result.status == CellValidationStatus.Success) {
      setSelectedItem(item);
      setMatchedItems([]);
      setFocusedItemIndex(null);
      setInputValue(item.name);
      return SelectingStatus.Success;
    } else {
      return SelectingStatus.Failure;
    }
  }

  
  function inputOnFocus() {
    inputCompleted(inputValue);
  }


  function inputOnBlur() {
    setJustBlurred(true);
  }
  

  function searchInput() {

    const inputElement = (
      <input type="text"
        style={ { width: settings.lastMinimumWidth || "unset" } }
        placeholder="Select a value"
        onChange={ (event) => {
          inputChanged(event.target.value.trimStart())
        } }
        autoComplete="off"
        autoCorrect="off"

        aria-haspopup="listbox"

        value={ inputValue }
        ref={ inputRef }
        onKeyDown={ inputOnKeyDown }
        onFocus={ inputOnFocus }
        onBlur={ () => {
          // The onblur event may happen because one of the matched items has been clicked.
          // Wait a bit to give precedence to the click event in that case.
          setTimeout( inputOnBlur, 200);
        } }
      />
    );

    return inputElement;
  }


  // Render one pulldown item per item in the array of search matches
  function dropdownItems() {

    // Helper function: Is the given index the same as the focused item index?
    function isFocused(index: number) {
      if (focusedItemIndex === null) { return false; }
      if (focusedItemIndex == index) { return true; }
      return false;
    }

    return (
      <table>
        <tbody>{
          matchedItems.map((item, index) => {
            return (
              <tr key={ index }
                className={ isFocused(index) ? "dropdown-item focused" : "dropdown-item" }
                onClick={ () => { selectItem(item); } }
                style={ {display: "table-row"} }
              >
                <td>{ highlightSearchTermsInString(item.name, [inputValue]) }</td>
                <td>{ highlightSearchTermsInString(item.description, [inputValue]) }</td>
              </tr>
            );
          })
        }</tbody>
      </table>
    );
  }
 
  return (
    <div className="cellautocomplete">
      <div className={ isDropdownActive() ? "dropdown is-active" : "dropdown" }>
        <div className="dropdown-trigger">
          { searchInput() }
        </div>
        <div className="dropdown-menu" role="menu">
          <div className="dropdown-content">
            { dropdownItems() }
          </div>
        </div>
      </div>
    </div>)
}


export { CellAutocomplete }
