import React, { useState, useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import { SampleConfigurationContext } from '../sampleConfigurationProvider.tsx';


const AddSamples: React.FC = () => {

  const sampleSetContext = useContext(SampleConfigurationContext);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<string>("1");
  const [validQuantity, setValidQuantity] = useState<boolean>(true);
  const [validName, setValidName] = useState<boolean>(true);
  const [uniqueName, setUniqueName] = useState<boolean>(true);
  const [validAllInput, setValidAllInput] = useState<boolean>(true);
  const [newName, setNewName] = useState<string>("Bar");
  const [inProgress, setInProgress] = useState<boolean>(false);

  function clickedOpen() {
    if (!inProgress && !isOpen) {
      setIsOpen(true);
      const goodNames = sampleSetContext.sets.generateUniqueNames(newName, 1);
      setNewName(goodNames[0]);
      validate(quantity, goodNames[0]);
    }
  }

  function changedQuantity(c:React.ChangeEvent<HTMLInputElement>) {
    const v = c.target.value;
    setQuantity(v);
    validate(v, newName);
  }

  function changedName(c:React.ChangeEvent<HTMLInputElement>) {
    const v = c.target.value;
    setNewName(v);
    validate(quantity, v);
  }

  function validate(quantity:string, name:string) {
    var validQuantity:boolean = true;
    var validName:boolean = true;
    var uniqueName:boolean = true;

    if (parseInt(quantity, 10) < 1) {
      validQuantity = false;
    }

    const trimmed = name.toString().trim();
    if (trimmed.length < 1) {
      validName = false;
    } else if (sampleSetContext.sets.all().some((c) => c.name == trimmed)) {
      validName = false;
      uniqueName = false;
    }

    setValidQuantity(validQuantity);
    setValidName(validName);
    setUniqueName(uniqueName);
    setValidAllInput(validQuantity && validName);
  }

  function pressedSubmit() {

    var count = Math.max(parseInt(quantity, 10), 1);
    var uniqueNames = sampleSetContext.sets.generateUniqueNames(newName, count);
    var uniqueIds = sampleSetContext.sets.generateUniqueIds(count);

    // This might be asynchronous in the future
    setInProgress(true);
    while (count > 0) {
      sampleSetContext.sets.add(uniqueNames[count-1], "", uniqueIds[count-1], true);
      count--;
    }
    sampleSetContext.changed();
    setInProgress(false);
    setIsOpen(false);
  };

  function clickedClose() {
    if (!inProgress && isOpen) { setIsOpen(false); }
  }

  return (
    <div>

      <button className="button" onClick={ clickedOpen }>Add Bars</button>

      <div id="modal-add-sample" className={ isOpen ? "modal is-active" : "modal" }>
        <div className="modal-background"></div>

        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Add Bars</p>
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
