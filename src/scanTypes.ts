

// Definitions and code for scan types


export type ScanTypeName = string & { __brand: 'Scan Type Name' };

export type ParamUid = string & { __brand: 'ParamUID' };
export type ScanParameterName = string & { __brand: 'Scan Parameter Name' };


export interface ParameterChoice {
  name: string;
  description: string;
}

export interface ScanParameterType {
  id: ParamUid;
  name: ScanParameterName;
  description: string;
  // If a choices field is present, we provide a pulldown isntead of a text field and restrict the choices to this array.
  choices?: ParameterChoice[];
  // If no default is provided the default is assumed to be "".
  default?: string;
  // If a non-blank value is mandatory for this parameter
  required?: boolean;
  // If the value should be unique across all samples in the same set.
  uniqueInSet?: boolean;
  // When new instances are generated, and the value should be unique, use this interval when auto-generating new values.
  autoGenerateInterval?: number;
  // Validates the input. Any return value other than null is considered an error and displayed as an error message.
  validator?: (value:string) => null | string;
}

export interface ScanParameterSettings {
  typeId: ParamUid;
  readOnly?: boolean;
  // If present, this will override the default in the ScanParameter definition.
  default?: string;
}

export interface ScanType {
  name: ScanTypeName;
  description: string;
  referenceUrl?: string;
  // Which parameters are valid for this ScanType. Given in order meant to be displayed.
  parameters: Array<ScanParameterSettings>;
}


export interface ScanTypes {
  typesByName: Map<ScanTypeName, ScanType>;
  typeNamesInDisplayOrder: ScanTypeName[];
  parametersById: Map<ParamUid, ScanParameterType>;
}


// Handy functions used to assist validation of parameter values.

const validate = {

  isInt: function(v:string):boolean { return !isNaN(parseInt(v, 10)); },
  isNumber: function(v:string):boolean { return !isNaN(v as any); },
  isAuto: function(v:string):boolean { return v.trim().toLowerCase() == "auto"; },

  above: function(a:number, v:string):boolean { const n = parseFloat(v); return !isNaN(n) && (n > a); },
  atOrAbove: function(a:number, v:string):boolean { const n = parseFloat(v); return !isNaN(n) && (n >= a); },
  atOrBelow: function(a:number, v:string):boolean { const n = parseFloat(v); return !isNaN(n) && (n <= a); },
  atOrBetween: function(a:number, b:number, v:string):boolean { const n = parseFloat(v); return ( !isNaN(n) && (n >= a) && (n <= b) ) },

  commaList: function(test:(v:string) => boolean, c:string):boolean { return c.split(",").every(test) },
  listSumsTo: function(a:number, v:string):boolean { return v.split(",").map(parseFloat).reduce((acc, cur) => acc+cur, 0) == a },

  isStrictAlphaNumeric: function(v:string):boolean { return v.search(/[^A-Za-z0-9\-_]/g) < 0 }
}


// This may eventually have to be an asynchronous function
export function getScanTypes(): ScanTypes {

  const parameters: ScanParameterType[] = [
    { id: "sample_center_position" as ParamUid,
      name: "Sample Center Position" as ScanParameterName,
      description: "Distance in mm from the left edge of the sample bar to the center of this sample. Should be unique with respect to the other samples on the bar.",
      default: "18",
      required: true,
      uniqueInSet: true,
      autoGenerateInterval: 12.7,
      validator: (v) => {
        if (validate.atOrBetween(1, 200, v)) { return null; }
        return "Must be a number between 1 and 200.";
      },
    },
    { id: "incident_angles" as ParamUid,
      name: "Incident Angles" as ScanParameterName,
      description: "A list of incident angles to use, between 0.1 and 0.4 degrees. For example 0.13, 0.15, 0.17.",
      default: "0.14",
      required: true,
      validator: (v) => {
        if (validate.commaList((n) => validate.atOrBetween(0.1, 0.4, n), v)) { return null; }
        return "Must be a comma-separated list of numbers, each between 0.1 and 0.4.";
      },
    },
    { id: "incident_angles_with_auto" as ParamUid,
      name: "Incident Angles" as ScanParameterName,
      description: "A list of incident angles to use, between -30 and 30 degrees. For example 0.13, 0.15, 0.17. Or enter \"auto\" to use the auto-incidence angle routine.",
      default: "auto",
      required: true,
      validator: (v) => {
        if (validate.isAuto(v) || validate.commaList((n) => validate.atOrBetween(0.1, 0.4, n), v)) { return null; }
        return "Must be \"auto\", or a comma-separated list of numbers, each between 0.1 and 0.4.";
      },
    },
    { id: "exposure_time" as ParamUid,
      name: "Exposure Time" as ScanParameterName,
      description: "The number of exposure seconds needed, or enter \"auto\" if auto exposure is desired.",
      default: "auto",
      required: true,
      validator: (v) => {
        if (validate.isAuto(v) || validate.above(0, v)) { return null; }
        return "Must be either a number, or \"auto\".";
      },
    },
    { id: "measurement_spots" as ParamUid,
      name: "Measurement Spots" as ScanParameterName,
      description: "The number of measurement spots, 2mm apart, relative to the center of the sample. (For example, 2 would measure at positions -1 and +1 relative to the center, and 3 would measure at -2, 0, 2.)",
      default: "1",
      validator: (v) => {
        if (validate.isInt(v) && validate.atOrAbove(1, v)) { return null; }
        return "Must be an integer, 1 or greater.";
      },
    },
    { id: "exposure_max" as ParamUid,
      name: "Max Exposure Time" as ScanParameterName,
      description: "The upper limit for exposure time in seconds. Can be up to 30.",
      default: "30",
      validator: (v) => {
        if (validate.atOrBetween(1, 30, v)) { return null; }
        return "Must be a number from 1 to 30.";
      },
    },
    { id: "image_type" as ParamUid,
      name: "Image Type" as ScanParameterName,
      description: "The type of image to generate",
      required: true,
      choices: [
        { name: "single", description: "A single image" },
        { name: "tiled", description: "An image composed of smaller overlapping images"}
      ],
      default: "tiled"
    },
    { id: "testunused" as ParamUid,
      name: "Demo" as ScanParameterName,
      description: "This parameter is unused, except for the test ScanType",
      choices: [
        { name: "choice1", description: "The first option of several" },
        { name: "choice2", description: "A second option"},
        { name: "rando", description: "some rando choice"},
        { name: "arthur", description: "King of the Britons (anachronistic)"}
      ],
      default: "choice1"
    },
    { id: "gpcam_params" as ParamUid,
      name: "gpCAM %" as ScanParameterName,
      description: "gpCAM input parameter percentages, totaling 100%. For example 70, 20, 10.",
      required: true,
      default: "50, 50",
      validator: (v) => {
        if (validate.commaList(validate.isNumber, v) && validate.listSumsTo(100, v)) { return null; }
        return "Must be a comma-separated list of numbers that add up to 100.";
      }
    },
  ];

  var parameterMap = new Map<ParamUid, ScanParameterType>();
  parameters.forEach((p) => parameterMap.set(p.id, p));

  // Specified in the order they will be displayed and searched in the UI.
  const types: ScanType[] = [
    {
      name: "GIWAXS" as ScanTypeName,
      description: "Standard GIWAXS.  All samples will be measured.",
      parameters: [
        { typeId: "sample_center_position" as ParamUid },
        { typeId: "incident_angles" as ParamUid },
        { typeId: "measurement_spots" as ParamUid, readOnly: true },
        { typeId: "exposure_time" as ParamUid, readOnly: true, default: "auto" },
        { typeId: "exposure_max" as ParamUid },
        { typeId: "image_type" as ParamUid }
      ]
    }
//    {
//      name: "GIWAXS with gpCAM" as ScanTypeName,
//      description: "Search for the best sample based on a percentage mixture of components.  Some samples may be skipped during the search.",
//      parameters: [
//        { typeId: "incident_angles" as ParamUid },
//        { typeId: "gpcam_params" as ParamUid },
//        { typeId: "exposure_time" as ParamUid, readOnly: true, default: "auto" },
//        { typeId: "exposure_max" as ParamUid },
//        { typeId: "image_type" as ParamUid }
//      ]
//    },
//    {
//      name: "Test" as ScanTypeName,
//      description: "Test ScanType. Not to be used in production. Has two parameters: \"testunused\" and \"image_type\".",
//      parameters: ["testunused" as ParamUid, "image_type" as ParamUid]
//    },
//    {
//      name: "GIWAXS with 3-parameter gpCAM" as ScanTypeName,
//      description: "GIWAXS with gpCAM optimization. Not all samples may be scanned.",
//      parameters: ["2" as ParamUid, "5" as ParamUid, "6" as ParamUid, "7" as ParamUid]
//    },
//    {
//      name: "GIWAXS with 6-parameter gpCAM" as ScanTypeName,
//      description: "GIWAXS with gpCAM optimization. Not all samples may be scanned.",
//      parameters: ["2" as ParamUid, "5" as ParamUid, "6" as ParamUid, "7" as ParamUid]
//    }
  ];

  var typeMap = new Map<ScanTypeName, ScanType>();
  types.forEach((t) => typeMap.set(t.name, t));

  return {
    typesByName: typeMap,
    typeNamesInDisplayOrder: types.map((t) => t.name ),
    parametersById: parameterMap
  };
}


