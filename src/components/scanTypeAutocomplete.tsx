import { useContext } from 'react';
import { SizeProp } from '@fortawesome/fontawesome-svg-core';
import 'bulma/css/bulma.min.css';

import { ScanType } from '../scanTypeDto.ts'
import { MetadataContext } from '../metadataProvider.tsx'
import { InputAutocomplete, SearchFunctions, SearchResult, SelectingStatus } from './inputAutocomplete.tsx'
import { highlightSearchTermsInString } from "./utils.tsx";
import './scanTypeAutocomplete.css';


interface ScanTypeSearchFunctions {
  itemSelected: (item: ScanType) => SelectingStatus;
  selectedNone: () => SelectingStatus;
}


// Settings passed in with the React component
interface ScanTypeAutocompleteParameters {
  selectedItem: ScanType | null;
  searchFunctions: ScanTypeSearchFunctions;
  inputSize?: string;
  iconSize?: SizeProp;
  isReadOnly?: boolean;
  greenWhenValid?: boolean;
  triggerFocus?: boolean;
  resetOnDefocus?: boolean;
  groupId?: string;
}


function ScanTypeAutocomplete(settings:ScanTypeAutocompleteParameters) {

  const metadataContext = useContext(MetadataContext);

  async function searchScanTypes(searchString: string): Promise<SearchResult<ScanType>> {
    const searchStringLower = searchString.toLowerCase();
    const toTest = metadataContext.scanTypes.typeNamesInDisplayOrder.map((t) => metadataContext.scanTypes.typesByName.get(t)!);
    const matches = toTest.filter((s) =>
                      s.name.toLowerCase().includes(searchStringLower) ||
                      s.description.toLowerCase().includes(searchStringLower));
    return { matches: matches };
  };

  function renderMatch(item: ScanType, searchString: string): JSX.Element {
    return (<>
              <td>{ highlightSearchTermsInString(item.name, [searchString]) }</td>
              <td>{ highlightSearchTermsInString(item.description, [searchString]) }</td>
            </>);
  }

  const scanTypeSearchFunctions: SearchFunctions<ScanType> = {
    itemToString: (item) => { return item.name },
    itemsRetriever: searchScanTypes,
    itemSelected: settings.searchFunctions.itemSelected,
    selectedNone: settings.searchFunctions.selectedNone,
    renderMatchedItem: renderMatch
  };

  return InputAutocomplete<ScanType>({
      value: settings.selectedItem ? settings.selectedItem.name : "",
      selectedItem: settings.selectedItem,
      searchFunctions: scanTypeSearchFunctions,
      addedClass: "scantype",
      inputSize: settings.inputSize,
      iconSize: settings.iconSize,
      placeholder: "Select a Scan Type",
      isReadOnly: settings.isReadOnly,
      greenWhenValid: settings.greenWhenValid,
      resetOnDefocus: settings.resetOnDefocus,
      triggerFocus: settings.triggerFocus,
      showAllByDefault: true,
      renderResultsAsTable: true
    });
}

export { ScanTypeAutocomplete }
export type { ScanTypeSearchFunctions }
