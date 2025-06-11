// Definitions of Scan Types

import { ScanTypeName } from "./scanTypeDto.ts";


export interface Group {
  id: string;
  name: string;
  description: string;

  // The name to show as a primary contact for this group.
  contactName: string;
  // The email address to show as a primary contact for this group.
  contactEmail: string;
  // The URL for linking to an overview of how to prepare samples for this particular group.
  overviewUrl: string;

  // The noun to use to refer to sets of samples, e.g. "bar".
  setName: string;
  setNameCapitalized: string;

  // The allowed Scan Types for this group.
  scanTypeNamesInDisplayOrder: ScanTypeName[];
}

// These should never be accessed.  They're usable as placeholders.
export const groupDefaults:Group = {
  id: "",
  name: "",
  description: "",
  contactName: "",
  contactEmail: "",
  overviewUrl: "",
  setName: "set",
  setNameCapitalized: "Set",
  scanTypeNamesInDisplayOrder: []
}

export interface Groups {
  groupsIdsInDisplayOrder: string[];
  groupsById: Map<string, Group>;
}


// This may eventually have to be an asynchronous function
export function getGroups(): Groups {

  const groups: Group[] = [
    { id: "733",
      name: "Beamline 733",
      description: "",
      contactEmail: "chenhuizhu@lbl.gov",
      contactName: "Chenhui Zhu",
      overviewUrl: "https://docs.google.com/document/d/1KUNBCg-yX-vUxbg_bFPRF_6JUcnKk0S0i3Cp-zqVUAU/edit?tab=t.0",
      setName: "bar",
      setNameCapitalized: "Bar",
      scanTypeNamesInDisplayOrder: [
        "GIWAXS" as ScanTypeName
      ]
    }
  ];

  var groupMap = new Map<string, Group>();
  groups.forEach((p) => groupMap.set(p.id, p));

  return {
    groupsIdsInDisplayOrder: groups.map((g) => g.id ),
    groupsById: groupMap
  };
}


