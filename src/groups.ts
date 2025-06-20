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
      name: "Beamline 7.3.3",
      description: "",
      contactEmail: "chenhuizhu@lbl.gov",
      contactName: "Chenhui Zhu",
      overviewUrl: "https://docs.google.com/document/d/1KUNBCg-yX-vUxbg_bFPRF_6JUcnKk0S0i3Cp-zqVUAU/edit?tab=t.0",
      setName: "bar",
      setNameCapitalized: "Bar",
      scanTypeNamesInDisplayOrder: [
        "GIWAXS" as ScanTypeName
      ]
    },
    { id: "402",
      name: "Beamline 4.0.2",
      description: "Beamline 4.0.2 is a soft X-ray beamline that mainly uses linear dichroism (XLD) and X-ray absorption spectroscopy (XAS) to study the electronic and magnetic properties of materials.",
      contactEmail: "cklewe@lbl.gov",
      contactName: "Christoph Klewe",
      overviewUrl: "https://docs.google.com/document/d/1KUNBCg-yX-vUxbg_bFPRF_6JUcnKk0S0i3Cp-zqVUAU/edit?tab=t.0",
      setName: "bar",
      setNameCapitalized: "Bar",
      scanTypeNamesInDisplayOrder: [
        "XAS" as ScanTypeName
      ]
    },
        { id: "631",
      name: "Beamline 6.3.1",
      description: "Beamline 6.3.1 is a soft X-ray beamline that mainly uses circular dichroism (XLD) and X-ray absorption spectroscopy (XAS) to study the electronic and magnetic properties of materials.",
      contactEmail: "atndiaye@lbl.gov",
      contactName: "Alpha N'Diaye",
      overviewUrl: "https://docs.google.com/document/d/1KUNBCg-yX-vUxbg_bFPRF_6JUcnKk0S0i3Cp-zqVUAU/edit?tab=t.0",
      setName: "bar",
      setNameCapitalized: "Bar",
      scanTypeNamesInDisplayOrder: [
        "XAS" as ScanTypeName
      ]
    }
  ];
     // Sort groups numerically by id
    groups.sort((a,b) => Number(a.id) - Number(b.id))

  var groupMap = new Map<string, Group>();
  groups.forEach((p) => groupMap.set(p.id, p));

  return {
    groupsIdsInDisplayOrder: groups.map((g) => g.id ),
    groupsById: groupMap
  };
}


