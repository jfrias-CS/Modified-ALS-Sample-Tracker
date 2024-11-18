import { Guid } from "./components/utils.tsx";

// Definitions and code for scan types


export type ScanTypeName = string & { __brand: 'Scan Type Name' };
export type ScanParameterName = string & { __brand: 'Scan Parameter Name' };


export interface ScanParameterType {
  id: Guid;
  name: ScanParameterName;
  description: string;
  // If a choices field is present, we provide a pulldown isntead of a text field and restrict the choices to this array.
  choices?: string[];
  // If no default is provided the default is assumed to be "".
  default?: string;
  // If a non-blank value is mandatory for this parameter
  required?: boolean;
  // Validates the input. Any return value other than null is considered an error and displayed as an error message.
  validator?: (value:string) => null | string;
}


export interface ScanType {
  name: ScanTypeName;
  description: string;
  referenceUrl?: string;
  parameters: Array<Guid>;
}


export interface ScanTypes {
  types: ScanType[];
  parameters: Map<Guid, ScanParameterType>;
}


// Handy functions used to assist validation of parameter values.

function isAuto(v:string):boolean { return v.trim().toLowerCase() == "auto"; };
function isInt(v:string):boolean { return !isNaN(parseInt(v, 10)); };
function isNumber(v:string):boolean { return !isNaN(v as any); };
function above(a:number, v:string):boolean { const n = parseFloat(v); return !isNaN(n) && (n > a); };
function atOrAbove(a:number, v:string):boolean { const n = parseFloat(v); return !isNaN(n) && (n >= a); };
function atOrBelow(a:number, v:string):boolean { const n = parseFloat(v); return !isNaN(n) && (n <= a); };
function commaList(test:(v:string) => boolean, c:string):boolean { return c.split(",").every(test) };


// This may eventually have to be an asynchronous function
export function getScanTypes(): ScanTypes {

  const parameters: ScanParameterType[] = [

    { id: "incangles" as Guid,
      name: "incident angles" as ScanParameterName,
      description: "A list of incident angles to use, between -30 and 30 degrees. For example 0.13, 0.15, 0.17. Or enter \"auto\" to use the auto-incident angle routine.",
      default: "auto",
      required: true,
      validator: (v) => {
        if (isAuto(v) || commaList(isNumber, v)) { return null; }
        return "Must be either a comma-separated list of numbers, or \"auto\".";
      },
    },
    { id: "exptime" as Guid,
      name: "exposure time" as ScanParameterName,
      description: "The number of exposure seconds needed, or enter \"auto\" if auto exposure is desired.",
      default: "auto",
      required: true,
      validator: (v) => {
        if (isAuto(v) || above(0, v)) { return null; }
        return "Must be either a number, or \"auto\".";
      },
    },
    { id: "mspots" as Guid,
      name: "measurement spots" as ScanParameterName,
      description: "The number of measurement spots per sample (2 mm apart, centered around center of sample).",
      default: "1",
      validator: (v) => {
        if (isInt(v) && atOrAbove(1, v)) { return null; }
        return "Must be an integer, 1 or greater.";
      },
    },
    { id: "expmax" as Guid,
      name: "max exposure time" as ScanParameterName,
      description: "The upper limit for exposure time in seconds. Can be up to 120.",
      default: "120",
      validator: (v) => {
        if (atOrAbove(1, v) && atOrBelow(120, v)) { return null; }
        return "Must be a number from 1 to 120.";
      },
    },
    { id: "imgtype" as Guid,
      name: "image type" as ScanParameterName,
      description: "The type of image to generate",
      required: true,
      choices: ["single", "tiled"],
      default: "tiled"
    }
  ];

  var parameterMap = new Map<Guid, ScanParameterType>();
  parameters.forEach((p) => parameterMap.set(p.id, p));

  const types: ScanType[] = [
    {
      name: "GIWAXS" as ScanTypeName,
      description: "GIWAXS",
      parameters: ["incangles" as Guid, "exptime" as Guid, "mspots" as Guid, "expmax" as Guid, "imgtype" as Guid]
    }
//      {
//        name: "GIWAXS with 3-parameter gpCAM" as ScanTypeName,
//        description: "GIWAXS with gpCAM optimization. Not all samples may be scanned.",
//        parameters: ["2" as Guid, "5" as Guid, "6" as Guid, "7" as Guid]
//      },
//      {
//        name: "GIWAXS with 6-parameter gpCAM" as ScanTypeName,
//        description: "GIWAXS with gpCAM optimization. Not all samples may be scanned.",
//        parameters: ["2" as Guid, "5" as Guid, "6" as Guid, "7" as Guid]
//      }
  ];

  return {
    types: types,
    parameters: parameterMap
  };
}


