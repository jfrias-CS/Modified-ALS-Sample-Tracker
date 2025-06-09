// Definitions of Scan Types

import { ScanTypeName } from "./scanTypeDto.ts";


export interface Group {
  id: string;
  name: string;
  description: string;

  // The URL for linking to an overview of how to prepare samples for this particular group.
  overviewUrl: string;
  // The name to show as a primary contact for this group.
  contactName: string;
  // The email address to show as a primary contact for this group.
  contactEmail: string;

  // The noun to use to refer to sets of samples, e.g. "bar".
  setName: string;
  // The allowed Scan Types for this group.
  scanTypeNamesInDisplayOrder: ScanTypeName[];
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
      overviewUrl: "18",
      contactEmail: "chenhuizhu@lbl.gov",
      contactName: "Chenhui Zhu",
      setName: "bar",
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


