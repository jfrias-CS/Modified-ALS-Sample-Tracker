// Data types for Scan Types and Scan Type Parameters.


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


// Handy functions used to assist validation of parameter values.

export const validate = {

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
