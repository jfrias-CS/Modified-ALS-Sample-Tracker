import React, { useState, useContext } from 'react';
import 'bulma/css/bulma.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

import { ScanTypeName, ScanType } from './scanTypes.ts'
import { Guid } from "./components/utils.tsx";
import { SampleConfiguration } from './sampleConfiguration.ts'
import { SampleConfigurationContext } from './sampleConfigurationProvider.tsx'
import { ScanTypeAutocomplete, ScanTypeSearchFunctions } from './components/scanTypeAutocomplete.tsx'


function AddSamples() {

  const sampleSetContext = useContext(SampleConfigurationContext);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<string>("1");
  const [validQuantity, setValidQuantity] = useState<boolean>(true);
  const [validName, setValidName] = useState<boolean>(true);
  const [uniqueName, setUniqueName] = useState<boolean>(true);
  const [validAllInput, setValidAllInput] = useState<boolean>(true);
  const [inProgress, setInProgress] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("1");
  const [scanTypeValue, setScanTypeValue] = useState<ScanType | null>(null)

  function clickedOpen() {
    if (!inProgress && !isOpen) {
      setIsOpen(true);
      const goodNames = sampleSetContext.instance.generateUniqueNames(newName, 1);
      setNewName(goodNames[0]);
      validate(quantity, goodNames[0], scanTypeValue);
    }
  }

  function changedQuantity(c:React.ChangeEvent<HTMLInputElement>) {
    const v = c.target.value;
    setQuantity(v);
    validate(v, newName, scanTypeValue);
  }

  function changedName(c:React.ChangeEvent<HTMLInputElement>) {
    const v = c.target.value;
    setNewName(v);
    validate(quantity, v, scanTypeValue);
  }

  function validate(quantity:string, name:string, scanType:ScanType | null) {
    var validQuantity:boolean = true;
    var validName:boolean = true;
    var uniqueName:boolean = true;

    if (parseInt(quantity, 10) < 1) {
      validQuantity = false;
    }

    const trimmed = name.toString().trim();
    if (trimmed.length < 1) {
      validName = false;
    } else {
      if (sampleSetContext.sampleConfigurations.some((c) => c.name == trimmed)) {
        validName = false;
        uniqueName = false;
      }
    }

    setValidQuantity(validQuantity);
    setValidName(validName);
    setUniqueName(uniqueName);
    setValidAllInput(validQuantity && validName && (scanType !== null));
  }

  function pressedSubmit() {
    var count = Math.max(parseInt(quantity, 10), 1);
    var uniqueNames = sampleSetContext.instance.generateUniqueNames(newName, count);
    var uniqueIds = sampleSetContext.instance.generateUniqueIds(count);
    var openLocations = sampleSetContext.instance.generateOpenLocations(count);

    var newSets = [];
    while (count > 0) {
      const newSet = {
        id: uniqueIds[count-1],
        idIsClientGenerated: true,
        mmFromLeftEdge: openLocations[count-1],
        name: uniqueNames[count-1],
        description: "",
        scanType: scanTypeValue!.name as ScanTypeName,
        parameters: { }
      };
      newSets.push(newSet);
      count--;
    }

    // This might be asynchronous in the future
    setInProgress(true);
    sampleSetContext.instance.addOrReplace(newSets);
    sampleSetContext.refresh();
    setInProgress(false);
    setIsOpen(false);
  };

  function clickedClose() {
    if (!inProgress && isOpen) { setIsOpen(false); }
  }


  const scanTypeSearchFunctions:ScanTypeSearchFunctions = {
    itemSelected: (item: ScanType) => { setScanTypeValue(item); validate(quantity, newName, item); },
    selectedNone: () => { setScanTypeValue(null); validate(quantity, newName, null); }
  };


  return (
    <div>

      <button className="button" onClick={ clickedOpen }>Add Samples</button>

      <div id="modal-add-sample" className={ isOpen ? "modal is-active" : "modal" }>
        <div className="modal-background"></div>

        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Add Samples</p>
            <button className="delete" aria-label="close" onClick={ clickedClose }></button>

          </header>
          <section className="modal-card-body">

            <div className="field">
              <label className="label">How Many?</label>
              <div className="control has-icons-right">
                <input className={ validQuantity ? "input" : "input is-danger" }
                  type="number"
                  placeholder="#"
                  value={ quantity }
                  onChange={ changedQuantity } />
                <span className="icon is-small is-right">
                  { validQuantity || (<FontAwesomeIcon icon={faExclamationTriangle} color="darkred" />) }
                </span>
              </div>
              { validQuantity || (<p className="help is-danger">Must enter a number &gt; 0</p>) }
            </div>

            <div className="field">
              <label className="label">Name</label>
              <div className="control has-icons-right">
                <input className={ validName ? "input" : "input is-danger" }
                  type="text"
                  placeholder="Unique name"
                  value={ newName }
                  onChange={ changedName } />
                <span className="icon is-small is-right">
                  { validName || (<FontAwesomeIcon icon={faExclamationTriangle} color="darkred" />) }
                </span>
              </div>
              { validName || (uniqueName ?
                              (<p className="help is-danger">This name is invalid</p>) :
                              (<p className="help is-danger">This name is not unique</p>))
              }
            </div>

            <div className="field">
              <label className="label">Scan Type</label>
              { ScanTypeAutocomplete({
                elementId: "addsamples-scantype",
                value: "",
                selectedItem: null,
                searchFunctions: scanTypeSearchFunctions
              }) }
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
export default AddSamples
