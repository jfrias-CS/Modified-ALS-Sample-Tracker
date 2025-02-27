import React, { useState, useEffect, useRef } from 'react';
import 'bulma/css/bulma.min.css';

import { ParameterChoice } from '../../../scanTypes.ts';
import { CellValidationStatus, CellHelpStatus, CellHelpMessage, CellValidationResult, CellSubcomponentParameters } from './cellDto.ts';
import { InputAutocomplete, SearchFunctions, SearchResult, SelectingStatus } from '../../../components/inputAutocomplete.tsx'
import { highlightSearchTermsInString } from "../../../components/utils.tsx";


interface ParameterOption {
  name: string;
  description: string;
}


interface CellAutocompleteParameters extends CellSubcomponentParameters {
  choices: ParameterChoice[];
}


function renderMatch(item: ParameterOption, searchString: string): JSX.Element {
  return (<>
            <td>{ highlightSearchTermsInString(item.name, [searchString]) }</td>
            <td>{ highlightSearchTermsInString(item.description, [searchString]) }</td>
          </>);
}


function CellAutocomplete(settings: CellAutocompleteParameters) {

  const [showHelp, setShowHelp] = useState<boolean>(true);
  
  // Turn the current value into a matching ParameterChoice (if any)
  var currentParameter:ParameterChoice | null = null;
  if ((settings.value !== null) && (settings.value !== undefined)) {
    currentParameter = settings.choices.find((s) => s.name == settings.value) || null;
  }


  async function search(searchString: string): Promise<SearchResult<ParameterOption>> {
    const searchStringLower = searchString.toLowerCase();
    const matches = settings.choices.filter((s) =>
                      s.name.toLowerCase().includes(searchStringLower) ||
                      s.description.toLowerCase().includes(searchStringLower));
    return { matches: matches };
  };


  function itemSelected(item: ParameterOption): SelectingStatus {
    // If the save is successful we expect settings.value to change
    // which will update the control.
    const result = settings.cellFunctions.save(item.name);
    if (result.status == CellValidationStatus.Success) {
      return SelectingStatus.Success;
    } else {
      return SelectingStatus.Failure;
    }
  }


  // Selecting nothing is not allowed
  function selectedNone(): SelectingStatus {
    return SelectingStatus.Failure;
  }


  // If an up or down arrow did not result in navigating the search dropdown,
  // it's sent here, where we see if it triggers navigation in the table.
  function unhandledKeyEvent(event: React.KeyboardEvent<HTMLInputElement>) {
    settings.cellFunctions.testKeyForMovement(event, true);
    // Since we've received a key that didn't trigger navigation in the search
    // dropdown, we'll assume it changed the value of the search box, which would
    // require showing the search pulldown.  That means we need to get the help box
    // out of the way.
    setShowHelp(false);
  }


  const searchFunctions: SearchFunctions<ParameterOption> = {
    itemToString: (item) => { return item.name },
    itemsRetriever: search,
    itemSelected: itemSelected,
    selectedNone: selectedNone,
    renderMatchedItem: renderMatch,
    unhandledKeyEvent: unhandledKeyEvent
  };


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


  return (
    InputAutocomplete<ParameterOption>({
      value: settings.value,
      selectedItem: currentParameter,
      searchFunctions: searchFunctions,

      showAllByDefault: true,
      renderResultsAsTable: true,
      triggerFocus: settings.triggerFocus,
      resetOnDefocus: true,

      placeholder: "Select a value",
      renderPlainInput: true,
      addedClass: "parametertype",
      addedInputStyle: { width: settings.lastMinimumWidth || "unset" },
    })
  );
}


export { CellAutocomplete }
