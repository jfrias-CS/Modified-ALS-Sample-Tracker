import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SizeProp } from '@fortawesome/fontawesome-svg-core';
import { faExclamationTriangle, faSpinner, faQuestion, faCheck } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';


// Style to apply when an item is focused in the search results pulldown.
const focusedStyle: React.CSSProperties = { border: "2px solid #3273dc", borderRadius: "10px" }


// Internal state tracking
enum SearchResultStatus { Success, SuccessWithWarning, Failure };

interface SearchResult<Item> {
  status?: SearchResultStatus;
  matches: Item[];
  message?: string | null;
}

type Retriever<Item> = (searchString: string) => Promise<SearchResult<Item>>;
type ItemToString<Item> = (item:Item) => string;


interface SearchFunctions<Item> {
  itemToString: ItemToString<Item>;
  itemsRetriever: Retriever<Item>;
  itemSelected: (item: Item) => void;
  selectedNone: () => void;
  renderMatchedItem?: (item: Item, searchString: string) => JSX.Element
}


// Settings passed in with the React component
interface InputAutocompleteParameters<Item> {
  elementId: string;
  addedStyle?: string;
  icon?: JSX.Element;
  inputSize?: string;
  iconSize?: SizeProp;
  placeholder?: string;
  value: string;
  isReadOnly?: boolean;
  showAllByDefault?: boolean;
  renderResultsAsTable?: boolean;
  greenWhenValid?: boolean;
  autoFocus?: boolean;
  debounceTime?: number;
  selectedItem: Item | null;
  searchFunctions: SearchFunctions<Item>;
}


// Internal state tracking
enum InputTypingState { NotTyping, IsTyping, StoppedTyping };
enum InputValidationState { NotTriggered, Succeeded, Failed };


function InputAutocomplete<Item>(settings:InputAutocompleteParameters<Item>) {

  // Just a small helper function to concetenate CSS class names
  function classNames(...names:(string|null)[]): string {
    return names.filter((name) => (name !== null) && (name.length > 0)).join(" "); 
  }

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

    validate();
  }, [justBlurred]);


  // This handles keyboard-based selection in the dropdown.
  // Changes to the input value are handled in inputChanged.
  function inputOnKeyDown(event:React.KeyboardEvent<HTMLInputElement>) {

    var move = 0;
    if ( isDropdownActive() ) {
      if (event.key == "ArrowDown") {
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
    // Send "nothing selected" one time when input starts.
    if (selectedItem !== null) { settings.searchFunctions.selectedNone(); }
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

    const controlClass = classNames("control", inputIcon ? "has-icons-left" : "", statusIcon ? "has-icons-right" : "");
    const inputClass = classNames("input", inputColor, settings.inputSize || "is-normal");

    return (
      <>
        <div className={ controlClass }>
          <input type="text"
            className={ inputClass }
            id={ "debouncer-autocomplete-" + (settings.elementId || "default") }
            placeholder={ settings.placeholder || "Enter value" }
            readOnly={ settings.isReadOnly }
            onChange={ (event) => {
              inputChanged(event.target.value.trimStart())
            } }
            autoComplete="off"
            autoCorrect="off"
            autoFocus={ settings.autoFocus }

            aria-haspopup="listbox"

            value={ inputValue }
            onKeyDown={ inputOnKeyDown }
            onFocus={ inputOnFocus }
            onBlur={ () => {
              // The onblur event may happen because one of the matched items has been clicked.
              // Wait a bit to give precedence to the click event in that case.
              setTimeout( inputOnBlur, 200);
            } }
          />
          { (inputIcon && (
              <span className={ classNames( "icon", "is-left", settings.iconSize || null) }>
                { inputIcon }
              </span>)
          ) }
          { (statusIcon && (
              <span className={ classNames( "icon", "is-right", settings.iconSize || null) }>
                { statusIcon }
              </span>)
          ) }
        </div>
        <div className={ classNames("help", inputColor) }
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
    <div className={ settings.addedStyle ? "autocomplete " + settings.addedStyle : "autocomplete" }>
      <div className={ isDropdownActive() ? "dropdown is-active" : "dropdown" }>
        <div className="dropdown-trigger">
          { searchInput() }
        </div>
        <div className="dropdown-menu" role="menu" id={ ("dropdown-autocomplete-" + (settings.elementId || "default") ) }>
          <div className="dropdown-content">
            { dropdownItems() }
          </div>
        </div>
      </div>
  </div>)
}

export { InputAutocomplete, SearchResultStatus }
export type { SearchFunctions, SearchResult  }
