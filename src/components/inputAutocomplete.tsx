import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SizeProp } from '@fortawesome/fontawesome-svg-core';
import { faExclamationTriangle, faSpinner, faQuestion, faCheck } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import './inputAutocomplete.css';
import { truthyJoin } from './utils.tsx';

// Style to apply when an item is focused in the search results pulldown.
const focusedStyle: React.CSSProperties = { border: "2px solid #3273dc", borderRadius: "10px" }


// Status tracking
enum SearchResultStatus { Success, SuccessWithWarning, Failure };
enum SelectingStatus { Success, Failure };

interface SearchResult<Item> {
  status?: SearchResultStatus;
  matches: Item[];
  message?: string | null;
}

type Retriever<Item> = (searchString: string) => Promise<SearchResult<Item>>;
type ItemToString<Item> = (item:Item) => string;


// Callbacks a user of this component needs to provide
interface SearchFunctions<Item> {
  itemToString: ItemToString<Item>;
  itemsRetriever: Retriever<Item>;
  itemSelected: (item: Item) => SelectingStatus;
  selectedNone: () => SelectingStatus;
  renderMatchedItem?: (item: Item, searchString: string) => JSX.Element;
  unhandledKeyEvent?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}


// Settings passed in with the component.  Most of these are optional.
interface InputAutocompleteParameters<Item> {
  value: string;
  selectedItem: Item | null;
  searchFunctions: SearchFunctions<Item>;

  // Make the input element read-only.
  isReadOnly?: boolean;
  // Show all the results when the input is empty.
  showAllByDefault?: boolean;
  // Expect renderMatchedItem to return table cells, suitable for wrapping in a table.
  renderResultsAsTable?: boolean;
  // Change the color of the element to green when validation passes.
  greenWhenValid?: boolean;
  // Whenever this is set to true, trigger a single focus event on the input element.
  triggerFocus?: boolean;
  // Reset the value to the un-edited one when the control loses focus.
  resetOnDefocus?: boolean;
  // Custom debounce time, in ms, to wait after keyboard activity to validate.
  debounceTime?: number;

  // Optional icon to display inside the input element, on the left.
  icon?: JSX.Element;
  // Bulma-style size indicator for the element, e.g. "is-small", "is-normal".
  inputSize?: string;
  // Bulma-style size indicator for the icons.
  iconSize?: SizeProp;
  // Placholder text to show when the input is empty.
  placeholder?: string;
  // Render the input element with no icons and no Bulma styling and wrapping.
  renderPlainInput?: boolean;
  // Extra class to append to the outer element
  addedClass?: string;
  // Extra styling to add directly to the input element
  addedInputStyle?: React.CSSProperties | undefined;
}


// Internal state tracking
enum InputTypingState { NotTyping, IsTyping, StoppedTyping };
enum InputValidationState { NotTriggered, Succeeded, Failed };


function InputAutocomplete<Item>(settings:InputAutocompleteParameters<Item>) {

  // Value in the DOM input element
  const [inputValue, setInputValue] = useState<string>(settings.value);
  // Which item in the dropdown is currently selected, if any, numbered from 0 starting at the top
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [typingState, setTypingState] = useState<InputTypingState>(InputTypingState.NotTyping);
  const [matchedItems, setMatchedItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [validationState, setValidationState] = useState<InputValidationState>(InputValidationState.NotTriggered);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [operationInProgress, setOperationInProgress] = useState<boolean>(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [justBlurred, setJustBlurred] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  // Only update if the selectedItem prop changes from the parent (not user selection)
  setSelectedItem(settings.selectedItem);
  if (settings.selectedItem) {
    setInputValue(settings.searchFunctions.itemToString(settings.selectedItem));
  } else {
    setInputValue("");
  }
  // eslint-disable-next-line
}, [settings.selectedItem]);

  function isDropdownActive(): boolean {
    return  (selectedItem == null) &&
            (matchedItems.length > 0) &&
            !operationInProgress &&
            (validationState == InputValidationState.NotTriggered)
  }


  // Triggered one time only, whenever the input is blurred.
  // Used to ensure the latest state values are being validated (instead of old ones),
  // after a click event on a pulldown item.
  useEffect(() => {
    if (!justBlurred) { return; }
    setJustBlurred(false);
    if (settings.resetOnDefocus) {
      // We rely on this happening after a timer, so a click-based selection
      // has time to take effect first.
      // This way, a blur that happens because the user clicked on an item in
      // the pulldown won't cause this call to reset the form to the previous value.
      reset();
    } else {
      validate();
    }
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
    } else if (settings.searchFunctions.unhandledKeyEvent !== undefined) {
      settings.searchFunctions.unhandledKeyEvent(event);
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
    setMatchedItems([]);
    setFocusedItemIndex(null);
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
    setSelectedItem(null);
  }


  function inputCompleted(value:string) {
    if (value.trim() != "" || settings.showAllByDefault) {
      setTypingState(InputTypingState.StoppedTyping);
      setOperationInProgress(true);
      settings.searchFunctions.itemsRetriever(value).then((result) => gotSearchResult(value, result));
    } else {
      setTypingState(InputTypingState.NotTyping);
    }
  }


  function gotSearchResult(value:string, result: SearchResult<Item>) {
    switch(result.status ?? SearchResultStatus.Success) {
      case SearchResultStatus.Success:
      case SearchResultStatus.SuccessWithWarning:
        if (result.matches.length == 1) {
          const resultAsString = settings.searchFunctions.itemToString(result.matches[0]);
          if (resultAsString == value) {
            setSelectedItem(result.matches[0]);
            setMatchedItems([]);
            setValidationState(InputValidationState.Succeeded);
            break;
          }
        }
        if (result.matches.length == 0) {
          setMatchedItems(result.matches);
          setValidationMessage(result.message ?? "No matches");
          setValidationState(InputValidationState.Failed);
        }
        setMatchedItems(result.matches);
        break;
      case SearchResultStatus.Failure:
        setValidationState(InputValidationState.Failed);
        setValidationMessage(result.message ?? "Error in search");
        break;
    }
    setOperationInProgress(false);
    setFocusedItemIndex(null);
  }


  function reset() {
    setSelectedItem(settings.selectedItem);
    setMatchedItems([]);
    setFocusedItemIndex(null);
    setTypingState(InputTypingState.NotTyping);
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
    if (debounceTimer) { clearTimeout(debounceTimer); }
    if (settings.selectedItem) {
      setInputValue(settings.searchFunctions.itemToString(settings.selectedItem));
    } else {
      setInputValue("");
    }
  }

  
  function selectItem(item: Item) {
    setSelectedItem(item);
    setMatchedItems([]);
    setFocusedItemIndex(null);
    setInputValue(settings.searchFunctions.itemToString(item));
    setValidationMessage(null);
    setValidationState(InputValidationState.Succeeded);
    settings.searchFunctions.itemSelected(item);
  }

  
  function validate() {
    if (selectedItem !== null) {
      setValidationMessage(null);
      setValidationState(InputValidationState.Succeeded);
    } else {
      if ((inputValue.trim() != "") && (matchedItems.length == 0)) {
        setValidationMessage("None found");
      } else {
        setValidationMessage("None selected");
      }
      setValidationState(InputValidationState.Failed);
    }
  }


  function inputOnFocus() {
    setValidationState(InputValidationState.NotTriggered);
    setValidationMessage(null);
    inputCompleted(inputValue);
  }


  function inputOnBlur() {
    setJustBlurred(true);
  }
  

  function searchInput() {

    var inputColor = "";
    var statusIcon: JSX.Element | null = null;
    var inputIcon: JSX.Element | null = settings.icon || null;

    if (operationInProgress) {
      statusIcon = (<FontAwesomeIcon icon={faSpinner} spin={true} />); 

    } else if ((typingState == InputTypingState.StoppedTyping) &&
               (validationState == InputValidationState.NotTriggered)) {
      statusIcon = (<FontAwesomeIcon icon={faQuestion} />);
      inputIcon = null;

    } else if (validationState == InputValidationState.Failed) {
      inputColor = "is-danger";
      statusIcon = (<FontAwesomeIcon icon={faExclamationTriangle} color="darkred" />); 

    } else if (validationState == InputValidationState.Succeeded) {
      if (settings.greenWhenValid) {
        inputColor = "is-success";
        statusIcon = (<FontAwesomeIcon icon={faCheck} color="green" />);
      } else {
        statusIcon = (<FontAwesomeIcon icon={faCheck} />);
      }
    }

    const controlClass = truthyJoin("control", inputIcon ? "has-icons-left" : "", statusIcon ? "has-icons-right" : "");
    const inputClass = settings.renderPlainInput ?
        truthyJoin(inputColor, settings.inputSize) :
        truthyJoin("input", inputColor, settings.inputSize || "is-normal");

    const inputElement = (
      <input type="text"
        className={ inputClass }
        style={ settings.addedInputStyle }
        placeholder={ settings.placeholder || "Enter value" }
        readOnly={ settings.isReadOnly }
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

    if (settings.renderPlainInput) {
      return inputElement;
    }

    return (
      <>
        <div className={ controlClass }>
          { inputElement }
          { (inputIcon && (
              <span className={ truthyJoin( "icon", "is-left", settings.iconSize || null) }>
                { inputIcon }
              </span>)
          ) }
          { (statusIcon && (
              <span className={ truthyJoin( "icon", "is-right", settings.iconSize || null) }>
                { statusIcon }
              </span>)
          ) }
        </div>
        <div className={ truthyJoin("help", inputColor) }
            hidden={ validationState == InputValidationState.NotTriggered }
          >
            { validationMessage || "" }
        </div>
      </>
    )
  }


  // Render one pulldown item per item in the array of search matches
  function dropdownItems() {

    // Helper function: Is the given index the same as the focused item index?
    function isFocused(index: number) {
      if (focusedItemIndex === null) { return false; }
      if (focusedItemIndex == index) { return true; }
      return false;
    }

    function renderOneItem(item: Item): JSX.Element {
      if (settings.searchFunctions.renderMatchedItem !== undefined) {
        return settings.searchFunctions.renderMatchedItem(item, inputValue );
      } else {
        return (<>{settings.searchFunctions.itemToString(item)}</>);
      }
    }

    if (settings.renderResultsAsTable) {
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
                  { renderOneItem(item) }
                </tr>
              );
            })
          }</tbody>
        </table>
      );
    } else {
      return matchedItems.map((item, index) => {
        return (
          <a href="#" className="dropdown-item"
            key={ index }
            onClick={ () => { selectItem(item); } }
            style={ isFocused(index) ? focusedStyle : {} }
          >
            { renderOneItem(item) }
          </a>
        );
      });  
    }
  }
 
  return (
    <div className={ settings.addedClass ? "autocomplete " + settings.addedClass : "autocomplete" }>
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

export { InputAutocomplete, SearchResultStatus, SelectingStatus }
export type { SearchFunctions, SearchResult  }
