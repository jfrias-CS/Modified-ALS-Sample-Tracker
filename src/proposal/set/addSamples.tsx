import React, { useState, useContext } from 'react';
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import { ScanType } from '../../scanTypes.ts';
import { Guid } from "../../components/utils.tsx";
import { SampleConfiguration, SampleConfigurationSet } from '../../sampleConfiguration.ts';
import { SampleConfigurationContext } from '../../sampleConfigurationProvider.tsx';
import { ScanTypeAutocomplete, ScanTypeSearchFunctions } from '../../components/scanTypeAutocomplete.tsx';
import { createNewConfiguration } from '../../sampleConfigurationDb.ts';


const AddSamples: React.FC = () => {

  const { setId } = useParams();

  const sampleSetContext = useContext(SampleConfigurationContext);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("Sample");
  const [quantity, setQuantity] = useState<string>("1");
  const [description, setDescription] = useState<string>("");
  const [scanTypeValue, setScanTypeValue] = useState<ScanType | null>(null)

  const [validQuantity, setValidQuantity] = useState<boolean>(true);
  const [validName, setValidName] = useState<boolean>(true);
  const [uniqueName, setUniqueName] = useState<boolean>(true);
  const [validAllInput, setValidAllInput] = useState<boolean>(true);

  const [inProgress, setInProgress] = useState<boolean>(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  function getSet(): SampleConfigurationSet | undefined {
    if (!setId) { return undefined; }
    return sampleSetContext.sets.getById(setId as Guid);
  }

  function clickedOpen() {
    const thisSet = getSet();
    if (!inProgress && !isOpen && thisSet) {
      setIsOpen(true);
      const goodNames = thisSet.generateUniqueNames(newName, 1);
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

  function changedDescription(c:React.ChangeEvent<HTMLInputElement>) {
    const v = c.target.value;
    setDescription(v);
  }

  function validate(quantity:string, name:string, scanType: ScanType | null) {
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
      const thisSet = getSet();
      if (thisSet) {
        if (thisSet.all().some((c) => c.name == trimmed)) {
          validName = false;
          uniqueName = false;
        }
      }
    }

    setValidQuantity(validQuantity);
    setValidName(validName);
    setUniqueName(uniqueName);
    setValidAllInput(validQuantity && validName && (scanType !== null));
  }

  async function pressedSubmit() {
    const thisSet = getSet();
    if (!thisSet) { return; }

    var error: string | null = null;

    var count = Math.max(parseInt(quantity, 10), 1);
    var uniqueNames = thisSet.generateUniqueNames(newName, count);
    var openLocations = thisSet.generateOpenLocations(count);

    setSubmitErrorMessage(null);
    setInProgress(true);

    var newSamples = [];
    while (count > 0 && (error === null)) {

      // Make a set of parameters for the chosen ScanType, with default or blank values.
      const parameters:Map<Guid, string|null> = new Map();
      scanTypeValue!.parameters.forEach((p) => {
        const parameterType = sampleSetContext.scanTypes.parametersById.get(p);
        if (parameterType) { parameters.set(parameterType.id, parameterType.default ?? ""); }
      });

      const result = await createNewConfiguration(thisSet.id, uniqueNames[count-1], description, scanTypeValue!.name);

      if (result.success) {
        const newSample = new SampleConfiguration({
          id: result.response!.id,
          mmFromLeftEdge: openLocations[count-1],
          name: uniqueNames[count-1],
          description: description,
          scanType: scanTypeValue!.name,
          parameters: parameters
        });
        newSamples.push(newSample);
      } else {
        error = result.message || "";
      }

      count--;
    }

    thisSet.addOrReplaceWithHistory(newSamples);
    sampleSetContext.changed();
    setInProgress(false);
    if (error !== null) {
      setSubmitErrorMessage(error);
    } else {
      setIsOpen(false);
    }
  };

  function clickedClose() {
    if (!inProgress && isOpen) { setSubmitErrorMessage(null); setIsOpen(false); }
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
              <label className="label">Description</label>
              <div className="control">
                <input className="input"
                  type="text"
                  placeholder="Optional description"
                  value={ description }
                  onChange={ changedDescription } />
              </div>
            </div>

            <div className="field">
              <label className="label">Scan Type</label>
                <ScanTypeAutocomplete
                    elementId="addsamples-scantype"
                    value=""
                    selectedItem={null}
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

            { submitErrorMessage && (
              <article className="message is-danger">
                <div className="message-body">
                  { submitErrorMessage }
                </div>
              </article>
            )}

          </section>

        </div>
      </div>

    </div>
  )
}
export default AddSamples
