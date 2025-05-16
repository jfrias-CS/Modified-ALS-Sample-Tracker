import { useState, useContext } from 'react';
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDown, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import { ScanTypeName, ScanType } from '../../scanTypes.ts';
import { Guid } from '../../components/utils.tsx';
import { ParamUid } from './../../scanTypes.ts';
import { SampleConfiguration, SampleConfigurationSet } from '../../sampleConfiguration.ts';
import { MetadataContext } from '../../metadataProvider.tsx';
import { SelectingStatus } from '../../components/inputAutocomplete.tsx'
import { ScanTypeAutocomplete, ScanTypeSearchFunctions } from '../../components/scanTypeAutocomplete.tsx';


const ImportSamples: React.FC = () => {

  var { setId } = useParams();
  setId = setId ? setId.toLowerCase() : "";

  const metadataContext = useContext(MetadataContext);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [validAllInput, setValidAllInput] = useState<boolean>(true);
  const [inProgress, setInProgress] = useState<boolean>(false);

  // Currently we just auto-set the pulldown to the first ScanType in the display order,
  // but this will need to change on a per-beamline or per-project basis eventually.
  const firstTypeName = metadataContext.scanTypes.typeNamesInDisplayOrder[0] || null;
  const initialScanTypeValue = firstTypeName ? metadataContext.scanTypes.typesByName.get(firstTypeName)! : null;
  const [scanTypeValue, setScanTypeValue] = useState<ScanType | null>(initialScanTypeValue)

  function getSet(): SampleConfigurationSet | undefined {
    if (!setId) { return undefined; }
    return metadataContext.sets.getById(setId as Guid);
  }

  function clickedOpen() {
    if (!inProgress && !isOpen) {
      setIsOpen(true);
      validate(scanTypeValue);
    }
  }


  function parseInput(rawText: string) {
    const delimiter = '\t';

    var longestRow: number;
    var rows: string[][];

    rows = [];
    // find the highest number of columns in a row
    longestRow = rawText.split(/[ \r]*\n/).reduce((prev: number, rawRow: string): number => {
      var row: string[];
      if (rawRow !== '') {
        row = rawRow.split(delimiter);
        rows.push(row);
        return Math.max(prev, row.length);
      }
      return prev;
    }, 0);

    // Pad out rows so the whole set is rectangular
    rows.forEach((row: string[]): void => {
      while (row.length < longestRow) {
        row.push('');
      }
    });
    return {
      'input': rows,
      'columns': longestRow
    };
  }


  function validate(scanType:ScanType | null) {

    setValidAllInput((scanType !== null));
  }

  function pressedSubmit() {
    const thisSet = getSet();
    if (!thisSet) { return; }
    const newConfig = new SampleConfiguration({
      id: "13434-ASDSAD-4" as Guid,
      setId: "" as Guid,
      name: "4",
      isValid: true,
      description: "This is the second sample.",
      scanType: "two_parameter_generic" as ScanTypeName,
      parameters: new Map()
    });
    thisSet.addOrReplaceWithHistory([newConfig]);
    metadataContext.changed();
  };

  function clickedClose() {
    if (!inProgress && isOpen) { setIsOpen(false); }
  }


  const scanTypeSearchFunctions:ScanTypeSearchFunctions = {
    itemSelected: (item: ScanType) => { setScanTypeValue(item); validate(item); return SelectingStatus.Success },
    selectedNone: () => { setScanTypeValue(null); validate(null); return SelectingStatus.Success }
  };


  return (
    <div>

      <button className="button" onClick={ clickedOpen }>Import Samples</button>

      <div id="modal-add-sample" className={ isOpen ? "modal is-active" : "modal" }>
        <div className="modal-background"></div>

        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Import Samples</p>
            <button className="delete" aria-label="close" onClick={ clickedClose }></button>

          </header>
          <section className="modal-card-body">

            <div className="columns">
              <div className="column">
                  To do a mass-import, you can copy a table from an Excel of Google document and paste it here.

              </div>
              <div className="column is-narrow">

                <div className="dropdown is-right is-hoverable">
                  <div className="dropdown-trigger">
                    <button className="button" aria-haspopup="true" aria-controls="dropdown-menu-howto">
                      <span>Hover for more info</span>
                      <FontAwesomeIcon icon={faAngleDown} /> 
                    </button>
                  </div>
                  <div className="dropdown-menu" id="dropdown-menu-howto" role="menu">
                    <div className="dropdown-content">
                      <div className="dropdown-item">
                        <p>
                          ( more instructions and an image here )
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="field">
              <label className="label">Table data</label>
              <div className="control">
                <textarea className="textarea" placeholder="Paste your table data here"></textarea>
              </div>
            </div>

            <div className="block">
              <p className="has-text-info">Detected 10 Samples using 2 Scan Types.</p>
            </div>

            <div className="field">
              <label className="label">How shall we deal with samples already entered?</label>
              <div className="control">
                <div className="radios">
                  <label className="radio">
                    <input type="radio" name="conflicts" style={{ marginRight: "0.5em" }} value="overwrite" />
                    Overwrite Existing Names
                  </label>
                  <label className="radio">
                    <input type="radio" name="conflicts" style={{ marginRight: "0.5em" }} value="unique" />
                    Create Unique Names
                  </label>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="label">Default Scan Type (if none is specified in data)</label>
                <ScanTypeAutocomplete
                    value=""
                    selectedItem={scanTypeValue}
                    searchFunctions={scanTypeSearchFunctions} />
            </div>

            <div className="buttons">
              <input
                type="button"
                className="button is-success"
                onClick={ pressedSubmit }
                disabled={ inProgress || !validAllInput }
                value="Add"
              />
              <button className="button" onClick={ clickedClose }>Cancel</button>
            </div>
            </section>

        </div>
      </div>

    </div>
  )
}
export default ImportSamples
