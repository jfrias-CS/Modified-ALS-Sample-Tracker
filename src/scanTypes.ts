// Definitions of Scan Types

import { ScanTypeName, ScanType, ParamUid, ScanParameterName, ScanParameterType, validate } from "./scanTypeDto.ts";


export interface ScanTypes {
  typesByName: Map<ScanTypeName, ScanType>;
  typeNamesInDisplayOrder: ScanTypeName[];
  parametersById: Map<ParamUid, ScanParameterType>;
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

    // NEW PARAMETERS
    // Added list of parameters for BeamLines 402 & 631
    {
      id: "element_template" as ParamUid,
      name: "Element" as ScanParameterName,
      description: "Choose element Template",
      required: true,
      default: "FeL3-2",
      validator: (v) => {
        if (validate.isStrictAlphaNumeric(v)) {return null;}
        return "Value must follow this structure: FeL3-2";
      }
    },

    {
      id: "repititions" as ParamUid,
      name: "Repetitions" as ScanParameterName,
      description: "Number of scan repititions.", 
      required: true,
      default: "8",
      validator:(v) => {
        if (validate.divisibleByFour(v)) { return null; }
        return "Must be either 4, 8, or 16";
      }
    },

    {
      id: "temperature" as ParamUid,
      name: "Temperature" as ScanParameterName,
      description: "Temperature in Kelvin", // needs to be finished
      required: true, // yes or no? 
      default: "0", // what should the default be?
      validator: (v) => {
        if (validate.atOrBetween(18, 450, v)) { return null; }
        return "Must be a value between 18 and 450.";
      }
    },

    {
      id: "Theta" as ParamUid,
      name: "Theta" as ScanParameterName,
      description: "Rotational Degree",
      required: true,
      default: "0",
      validator: (v) => {
        if (validate.atOrBetween(-270, 270, v)) { return null; }
        return "Value should range within -270 - 270"; // How to describe which direction postive or negative is? Unit circle? 
      }
    }, 
    {
      id: "Y-Position" as ParamUid,
      name: "Y-Position" as ScanParameterName,
      description: "Y-Axis Translation",
      required: true,
      default: "0",
      validator: (v) => {
        if (validate.atOrBetween(-13, 2, v)) { return null; }
        return "Value should range within [-13mm, 2mm]"; // How to describe which direction postive or negative is? Unit circle? 
      }
    }, 

    {
      id: "magnetic_field" as ParamUid,
      name: "Magnetic Field" as ScanParameterName,
      description: "Strength of Magnetic Field",
      required: true,
      default: "0",
      validator: (v) => {
        if (validate.atOrBetween(-1.8, 1.8, v)) { return null; }
        return "Value must range from -1.8 to 1.8 Tesla";
      }
    },

    {
      id: "order_parameter" as ParamUid,
      name: "Order of paramters" as ScanParameterName,
      description: "Select how to order parameters.",
      required: false,
      default: "Sample Center Position",
    }
  ];

  const parameterMap = new Map<ParamUid, ScanParameterType>();
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
    },


    // Scan Types for BL 4.0.2 & 6.3.1
    {
      name: "XAS" as ScanTypeName,
      description: "Standard X-ray Absorption Spectroscopy. All samples will be measured.",
       parameters: [
        { typeId: "sample_center_position" as ParamUid },
        { typeId: "incident_angles" as ParamUid },
        { typeId: "element_template" as ParamUid},
        { typeId: "repititions" as ParamUid },
        { typeId: "temperature" as ParamUid },
        { typeId: "Theta" as ParamUid },
        { typeId: "Y-Position" as ParamUid },
        { typeId: "order_parameter" as ParamUid }
      ]
    },

    {
      name: "XMCD" as ScanTypeName,
      description: "X-Ray Magnetic Circular Dichroism",
      parameters: [
        { typeId: "sample_center_position" as ParamUid },
        { typeId: "incident_angles" as ParamUid },
        { typeId: "repititions" as ParamUid },
        { typeId: "temperature" as ParamUid },
        { typeId: "magnetic_field" as ParamUid }
      ]
    },

    // Only at 402
    {
      name: "XMLD" as ScanTypeName,
      description: "X-Ray Magnetic Linear Dichroism",
      parameters: [
        { typeId: "sample_center_position" as ParamUid },
        { typeId: "incident_angles" as ParamUid },
        { typeId: "repititions" as ParamUid },
        { typeId: "temperature" as ParamUid }
      ]
    },

    {
      name: "XLD" as ScanTypeName,
      description: "X-Ray Linear Dichroism",
      parameters: [
        { typeId: "sample_center_position" as ParamUid },
        { typeId: "incident_angles" as ParamUid },
        { typeId: "repititions" as ParamUid },
        { typeId: "temperature" as ParamUid }
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


