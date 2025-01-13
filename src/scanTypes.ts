

// Definitions and code for scan types


export type ScanTypeName = string & { __brand: 'Scan Type Name' };

export type ParamUid = string & { __brand: 'ParamUID' };
export type ScanParameterName = string & { __brand: 'Scan Parameter Name' };


export interface ScanParameterType {
  id: ParamUid;
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
  // Which parameters are valid for this ScanType. Given in order meant to be displayed.
  parameters: Array<ParamUid>;
}


export interface ScanTypes {
  typesByName: Map<ScanTypeName, ScanType>;
  typeNamesInDisplayOrder: ScanTypeName[];
  parametersById: Map<ParamUid, ScanParameterType>;
}


// Handy functions used to assist validation of parameter values.

function isAuto(v:string):boolean { return v.trim().toLowerCase() == "auto"; };
function isInt(v:string):boolean { return !isNaN(parseInt(v, 10)); };
function isNumber(v:string):boolean { return !isNaN(v as any); };
function above(a:number, v:string):boolean { const n = parseFloat(v); return !isNaN(n) && (n > a); };
function atOrAbove(a:number, v:string):boolean { const n = parseFloat(v); return !isNaN(n) && (n >= a); };
function atOrBelow(a:number, v:string):boolean { const n = parseFloat(v); return !isNaN(n) && (n <= a); };
function atOrBetween(a:number, b:number, v:string):boolean { return atOrAbove(a, v) && atOrBelow(b, v); };
function commaList(test:(v:string) => boolean, c:string):boolean { return c.split(",").every(test) };
function listSumsTo(a:number, v:string):boolean { return v.split(",").map(parseFloat).reduce((acc, cur) => acc+cur, 0) == a };


// This may eventually have to be an asynchronous function
export function getScanTypes(): ScanTypes {

  const parameters: ScanParameterType[] = [

    { id: "incangles" as ParamUid,
      name: "Incident Angles" as ScanParameterName,
      description: "A list of incident angles to use, between -30 and 30 degrees. For example 0.13, 0.15, 0.17. Or enter \"auto\" to use the auto-incident angle routine.",
      default: "auto",
      required: true,
      validator: (v) => {
        if (isAuto(v) || commaList(isNumber, v)) { return null; }
        return "Must be either a comma-separated list of numbers, or \"auto\".";
      },
    },
    { id: "exptime" as ParamUid,
      name: "Exposure Time" as ScanParameterName,
      description: "The number of exposure seconds needed, or enter \"auto\" if auto exposure is desired.",
      default: "auto",
      required: true,
      validator: (v) => {
        if (isAuto(v) || above(0, v)) { return null; }
        return "Must be either a number, or \"auto\".";
      },
    },
    { id: "mspots" as ParamUid,
      name: "Measurement Spots" as ScanParameterName,
      description: "The number of measurement spots per sample (2 mm apart, around center of sample, including center spot.)",
      default: "1",
      validator: (v) => {
        if (isInt(v) && atOrAbove(1, v)) { return null; }
        return "Must be an integer, 1 or greater.";
      },
    },
    { id: "expmax" as ParamUid,
      name: "Max Exposure Time" as ScanParameterName,
      description: "The upper limit for exposure time in seconds. Can be up to 120.",
      default: "120",
      validator: (v) => {
        if (atOrBetween(1, 120, v)) { return null; }
        return "Must be a number from 1 to 120.";
      },
    },
    { id: "imgtype" as ParamUid,
      name: "Image Type" as ScanParameterName,
      description: "The type of image to generate",
      required: true,
      choices: ["single", "tiled"],
      default: "tiled"
    },
    { id: "testunused" as ParamUid,
      name: "Demo" as ScanParameterName,
      description: "This parameter is unused, except for the test ScanType",
    }
  ];

  var parameterMap = new Map<ParamUid, ScanParameterType>();
  parameters.forEach((p) => parameterMap.set(p.id, p));

  // Specified in the order they will be displayed and searched in the UI.
  const types: ScanType[] = [
    {
      name: "GIWAXS" as ScanTypeName,
      description: "GIWAXS",
      parameters: ["incangles" as ParamUid, "exptime" as ParamUid, "mspots" as ParamUid, "expmax" as ParamUid, "imgtype" as ParamUid]
    },
    {
      name: "Test" as ScanTypeName,
      description: "Test ScanType. Not to be used in production. Has two parameters: \"testunused\" and \"imgtype\".",
      parameters: ["testunused" as ParamUid, "imgtype" as ParamUid]
    }
//      {
//        name: "GIWAXS with 3-parameter gpCAM" as ScanTypeName,
//        description: "GIWAXS with gpCAM optimization. Not all samples may be scanned.",
//        parameters: ["2" as ParamUid, "5" as ParamUid, "6" as ParamUid, "7" as ParamUid]
//      },
//      {
//        name: "GIWAXS with 6-parameter gpCAM" as ScanTypeName,
//        description: "GIWAXS with gpCAM optimization. Not all samples may be scanned.",
//        parameters: ["2" as ParamUid, "5" as ParamUid, "6" as ParamUid, "7" as ParamUid]
//      }
  ];

  var typeMap = new Map<ScanTypeName, ScanType>();
  types.forEach((t) => typeMap.set(t.name, t));

  return {
    typesByName: typeMap,
    typeNamesInDisplayOrder: types.map((t) => t.name ),
    parametersById: parameterMap
  };
}


