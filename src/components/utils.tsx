// Typescript feature: "Nominal types".
// This is a string in structure but it's treated as a distinct type.
export type Guid = string & { __brand: 'GUID' };


// Just a small helper function used to to concatenate CSS class names
export function truthyJoin(...names:(string|null|false|undefined)[]): string {
  return names.filter((name) => (name !== undefined) && (name !== null) && (name !== false) && (name.length > 0)).join(" "); 
}


// This is a sorting function that will sort strings while respecting
// the relative value of numbers inlined into the strings.
// For example, it would sort the following strings like so:
//    00000
//    2
//    2b
//    14
//    A-01
//    A-3
//    A-13
//    bbb12342bfb333b-1-2-3-011
//    bbb12342bfb333b-1-2-21-01
export function sortWithNumberParsing(a:string, b:string):number {
  var result = 0;

  // Jsut in case some lunatic passes in non-string things
  if (a === undefined || a === null) {
    return -1
  } else if (b === undefined || b === null) {
    return 1
  }

  // A empty string gets moved to the bottom
  if (a.length < 1) {
    return -1
  } else if (b.length < 1) {
    return 1
  }

  var aIndex = 0;
  var bIndex = 0;

  var aNumberString:string[] = [];
  var bNumberString:string[] = [];

  while (!result) {
    var aChar = a.charAt(aIndex);
    aIndex++;
    // Seek further forward in the string for as long as we keep seeing digits.
    while ("0" <= aChar && aChar <= "9") {
        aNumberString.push(aChar);
        if (aIndex < a.length) {
          aChar = a.charAt(aIndex);
          aIndex++;
        } else {
          // Exit this loop. The contents of aChar are stale,
          // but also irrelevant now that we have a number.
          break;
        }
    }

    // Same procedure for string b.
    var bChar = b.charAt(bIndex);
    bIndex++;
    while ("0" <= bChar && bChar <= "9") {
        bNumberString.push(bChar);
        if (bIndex < b.length) {
          bChar = b.charAt(bIndex);
          bIndex++;
        } else {
          break;
        }
    }

    // If we got two numbers, compare them as numbers.
    if (aNumberString.length > 0 && aNumberString.length > 0) {
      const aNum = parseInt(aNumberString.join(""), 10);
      const bNum = parseInt(bNumberString.join(""), 10);
      result = aNum - bNum;
      // If the numbers are identical, result will be zero, and we'll need to keep going.
      // Clear the number arrays for the next iteration.
      aNumberString = [];
      bNumberString = [];

    // If the a segment is a number and the b segment is not, don't bother
    // parsing the number, just give it priority.
    } else if (aNumberString.length > 0) {
      result = -1;
    // Same in the other direction.
    } else if (bNumberString.length > 0) {
      result = 1;

    // At this point we know we got two non-number characters,
    // and have moved the pointers on to the next character, or off the end of the string,
    // for a and b.

    // If the two characters are not identical, use localeCompare to get a result.
    } else if (aChar !== bChar) {
      result = aChar.localeCompare(bChar);
    }

    // The remaining case of the the two characters being identical does not give us a result.

    // If we didn't get a result so far, check to see if we've moved off the end
    // of one string or the other, in which case we should favor the shorter string.
    if (result == 0) {
      if (aIndex >= a.length) {
        result = -1
      } else if (bIndex >= b.length) {
        result = 1
      }
    }
  }
  return result;
}


// Given a target string, and a list of search strings,
// modify the target string so that all the occurrences of the search strings
// (searching case-insensitively) are boldfaced, and return the result as a ReactElement list.
// If no search strings occur in the target string, return a ReactElement list containing
// the target string as-is.
export function highlightSearchTermsInString(targetStr:string, searchTerms:string[]) : JSX.Element[] {

  interface StringRegion {
    start: number;
    end: number;
  }
  
  // If the string is empty, don't bother annotating.
  if (targetStr.length < 1) {
      return [<></>];
  }

  // If we have no search terms, don't annotate.
  if (searchTerms.length == 0) {
      return [<>{targetStr}</>];
  }

  const nonEmptySearchTerms =
    searchTerms.map((t) => t.trim()).filter((t) => t.length > 1).map((t) => t.toLocaleUpperCase());

  // If we have no non-blank search terms, don't annotate.
  if (nonEmptySearchTerms.length == 0) {
    return [<>{targetStr}</>];
  }

  // Test against the string in a case-insensitive manner
  const upperStr = targetStr.toLocaleUpperCase();

  // Accumulate a list of regions within the string that match a search term.

  function recursiveRegionFind(searchTerm: string, regions: StringRegion[], index: number): StringRegion[] {
    if (index >= targetStr.length) { return regions; }
    const matchValue = upperStr.indexOf(searchTerm, index) | 0;
    if (matchValue < 0) { return regions; }
    regions.push({ start: matchValue, end: (matchValue + searchTerm.length) });
    return recursiveRegionFind(searchTerm, regions, matchValue+1);
  }

  var regions:StringRegion[] = [];

  nonEmptySearchTerms.forEach((term) => {
    const firstFoundIndex = upperStr.indexOf(term.toLocaleUpperCase()) | 0;
    if (firstFoundIndex < 0) { return; }
    const startingList = [{start: firstFoundIndex, end: firstFoundIndex + term.length}];
    const completeList = recursiveRegionFind(term, startingList, firstFoundIndex + 1);
    regions = regions.concat(completeList);
  });

  // No matches on the search terms?  Nothing to highlight.
  if (regions.length == 0) {
    return [<>{targetStr}</>];
  }

  const sortedRegions = regions.sort((a, b) => (a.start - b.start));

  // Given an array of regions sorted by starting point, return a reduced set:
  // Every region that overlaps with another will be combined.
  function rubberBandReduce(reducedList: StringRegion[], currentMin: number, currentMax: number, remainingRegions: StringRegion[]): StringRegion[] {
    if (remainingRegions.length == 0) {
      reducedList.push({start: currentMin, end: currentMax});
      return reducedList;
    }
    const nextRegion = remainingRegions.shift();
    if (nextRegion!.start < currentMax + 1) {
      return rubberBandReduce(reducedList, currentMin, nextRegion!.end, remainingRegions);
    } else {
      reducedList.push({start: currentMin, end: currentMax});
      return rubberBandReduce(reducedList, nextRegion!.start, nextRegion!.end, remainingRegions);
    }
  }

  var reducedRegions = sortedRegions;
  if (reducedRegions.length > 1) {
    const firstRegion = reducedRegions.shift();
    reducedRegions = rubberBandReduce([], firstRegion!.start, firstRegion!.end, reducedRegions);
  }

  var highlightedString: JSX.Element[] = [];
  var lastRegionEnd: number = 0;

  while (reducedRegions.length > 0) {
    const thisRegion = reducedRegions.shift();
    
    const nonBoldStr = targetStr.slice(lastRegionEnd, thisRegion!.start);
    const boldStr = targetStr.slice(thisRegion!.start, thisRegion!.end);

    highlightedString.push(<>{nonBoldStr}</>);
    highlightedString.push(<b>{boldStr}</b>);
    
    lastRegionEnd = thisRegion!.end;
  }

  if (lastRegionEnd < targetStr.length) {
    const nonBoldStr = targetStr.slice(lastRegionEnd, targetStr.length);
    highlightedString.push(<>{nonBoldStr}</>);
  }

  return highlightedString;
}


// Given a suggested name (and potentially an index to start with),
// split the name into a prefix and a suffix, where the suffix is a number,
// and increment that number (or the given start index) to make a new name,
// until the new name is unique with respect to the given array of existing names.
// E.g. a given name of "abc-10-123" would render a new name of "abc-10-124",
// unless a name "abc-10-124" already exists, in which case the
// new name will be "abc-10-125", and so on.
// Or, if a startIndex of "2" is provided, a given name of "abc-10-123"
// would first try "abc-10-2", and proceed upwards from there.
export function generateUniqueNames(existingNames: string[], suggestedName: string, quantity?: number, startIndex?: number | null) {
  var chosenPrefix = suggestedName;
  var chosenQuantity = Math.max(quantity||1, 1);
  var chosenStartIndex = startIndex || 1;

  if (suggestedName.length > 0) {
    const findTrailingNumber = /([0-9]+)$/;
    const match = findTrailingNumber.exec(suggestedName);
    if (match) {
      chosenPrefix = suggestedName.slice(0, suggestedName.length - match[0].length);
      const detectedIndex = parseInt(match[0], 10);
      chosenStartIndex = startIndex || detectedIndex || 1;
    } else {
      // If we have a suggestedName but it has no trailing number,
      // we're going to add a number to it.
      // Here we'll put a dash between them.
      if (!suggestedName.endsWith("-")) {
        chosenPrefix = suggestedName + "-";
      }
    }
  }

  // If we need to optimize, caching this set somewhere would be
  // a good start.  Currently it's tricky because undo/redo
  // state can invalidate it, and we modify the set below.
  let existingNameSet: Set<string> = new Set();
  existingNames.forEach((v) => { existingNameSet.add(v) });

  var goodNames = [];
  var goodName = suggestedName;
  while (chosenQuantity > 0) {
    while (existingNameSet.has(goodName)) {
      goodName = chosenPrefix + chosenStartIndex.toString();
      chosenStartIndex++;
    }
    goodNames.push(goodName);
    existingNameSet.add(goodName);
    chosenQuantity--;
  }
  return goodNames;
}
