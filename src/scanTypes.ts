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
  // If no default is provided the default is assumed to be null.
  default?: string;
  // If a non-blank value is mandatory for this parameter
  required?: boolean;
}


export interface ScanType {
  name: ScanTypeName;
  description: string;
  referenceUrl?: string;
  parameters: Array<Guid>;
}


export interface ScanTypes {
  types: ScanType[];
  parameters: ScanParameterType[];
}


// This may eventually have to be an asynchronous function
export function getScanTypes(): ScanTypes {
  return {
    types: [
      {
        name: "GIWAXS" as ScanTypeName,
        description: "GIWAXS with gpCAM optimization",
        parameters: ["1" as Guid, "2" as Guid, "3" as Guid, "4" as Guid]        
      },
      {
        name: "GIWAXS with 3-parameter gpCAM" as ScanTypeName,
        description: "GIWAXS with gpCAM optimization. Not all samples may be scanned.",
        parameters: ["2" as Guid, "5" as Guid, "6" as Guid, "7" as Guid]
      },
      {
        name: "GIWAXS with 6-parameter gpCAM" as ScanTypeName,
        description: "GIWAXS with gpCAM optimization. Not all samples may be scanned.",
        parameters: ["2" as Guid, "5" as Guid, "6" as Guid, "7" as Guid]
      }
    ],
    parameters: [
      { id: "1" as Guid,
        name: "incident angles" as ScanParameterName,
        description: "A list of incident angles to use, between -30 and 30 degrees.  For example 0.13, 0.15, 0.17. Or leave blank to use the auto-incident angle routine."
      },
      { id: "2" as Guid,
        name: "exposure time" as ScanParameterName,
        description: "The number of exposure seconds needed or, if auto exposure is desired, leave blank.",
      },
      { id: "3" as Guid,
        name: "measurement spots" as ScanParameterName,
        description: "The number of measurement spots per sample (2 mm apart).",
        default: "2"
      },
      { id: "4" as Guid,
        name: "image type" as ScanParameterName,
        description: "The type of image to generate",
        choices: ["single", "tiled"],
        default: "tiled"
      },
      { id: "5" as Guid,
        name: "component A (%), gpCAM para 1" as ScanParameterName,
        description: "Weight percentage of parameter 1.",
        required: true,
        default: "33"
      },
      { id: "6" as Guid,
        name: "component B (%), gpCAM para 2" as ScanParameterName,
        description: "Weight percentage of parameter 2.",
        required: true,
        default: "33"
      },
      { id: "7" as Guid,
        name: "component C (%), gpCAM para 3" as ScanParameterName,
        description: "Weight percentage of parameter 3.",
        required: true,
        default: "34"
      }
    ]
  }
}


