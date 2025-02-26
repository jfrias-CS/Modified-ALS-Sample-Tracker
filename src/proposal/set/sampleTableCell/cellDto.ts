// Data types and interfaces used by the editable cell and its subcomponents (text field, pulldown, etc)

enum CellValidationStatus { Success, Failure };
interface CellValidationResult {
  status: CellValidationStatus;
  message: string | null;
}
// Signature of a function used to validate the current value held by the cell with the given coordinates.
type CellValidator = (x: number, y: number, inputString: string) => CellValidationResult;


enum CellNavigationDirection { Up, Down, Left, Right };
// Signature of a function used to attempt to navigate away from this cell.
type CellNavigator = (x: number, y: number, d: CellNavigationDirection) => CellValidationStatus;


// These are the functions needed by the editable cell.
// They need to be implemented and passed in by any table using editable cells.
// In a typical implementation they can be defined once and then passed in by reference to every cell in the table.
interface CellFunctions {
  validate: CellValidator;
  save: CellValidator;
  move: CellNavigator;
}


enum CellHelpStatus { Hide, Normal, Info, Danger };
interface CellHelpMessage {
  status: CellHelpStatus;
  message?: string | null;
}


// These are the functions needed by all the input types that we support inside an editable cell,
// e.g. text field, autocomplete pulldown.
interface CellSubcomponentFunctions {
  validate: (inputString: string) => CellValidationResult;
  save: (inputString: string) => CellValidationResult;
  setHelp: (help: CellHelpMessage) => void;
  testKeyForMovement: (event: React.KeyboardEvent<HTMLInputElement>, useArrows: boolean) => boolean;
}


// Settings passed to cell subcomponents, e.g. text and autocomplete fields
interface CellSubcomponentParameters {
  triggerFocus: boolean;
  value: string;
  description?: string;
  lastMinimumWidth: string;
  cellFunctions: CellSubcomponentFunctions;
}


export { CellValidationStatus, CellNavigationDirection, CellHelpStatus }
export type { CellValidationResult, CellFunctions, CellHelpMessage, CellSubcomponentFunctions, CellSubcomponentParameters }
