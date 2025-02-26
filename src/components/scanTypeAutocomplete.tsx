import { useContext } from 'react';
import { SizeProp } from '@fortawesome/fontawesome-svg-core';
import 'bulma/css/bulma.min.css';

import { ScanType } from '../scanTypes.ts'
import { MetadataContext } from '../metadataProvider.tsx'
import { InputAutocomplete, SearchFunctions, SearchResult } from './inputAutocomplete.tsx'
import { highlightSearchTermsInString } from "./utils.tsx";
import './scanTypeAutocomplete.css';


interface ScanTypeSearchFunctions {
  itemSelected: (item: ScanType) => void;
  selectedNone: () => void;
}


// Settings passed in with the React component
interface ScanTypeAutocompleteParameters {
  inputSize?: string;
  iconSize?: SizeProp;
  value: string;
  isReadOnly?: boolean;
  greenWhenValid?: boolean;
  autoFocus?: boolean;
  selectedItem: ScanType | null;
  searchFunctions: ScanTypeSearchFunctions;
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
      addedClass: "scantype",
      inputSize: settings.inputSize,
      iconSize: settings.iconSize,
      placeholder: "Select a Scan Type",
      value: settings.value,
      isReadOnly: settings.isReadOnly,
      greenWhenValid: settings.greenWhenValid,
      autoFocus: settings.autoFocus,
      showAllByDefault: true,
      renderResultsAsTable: true,
      selectedItem: settings.selectedItem,
      searchFunctions: scanTypeSearchFunctions
    });
}

export { ScanTypeAutocomplete }
export type { ScanTypeSearchFunctions }
