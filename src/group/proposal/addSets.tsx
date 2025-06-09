import React, { useState, useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import { MetadataContext } from '../../metadataProvider.tsx';
import { createNewSet } from '../../metadataApi.ts';


const AddSets: React.FC = () => {

  const metadataContext = useContext(MetadataContext);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<string>("1");
  const [newName, setNewName] = useState<string>("Bar");
  const [description, setDescription] = useState<string>("");

  const [validQuantity, setValidQuantity] = useState<boolean>(true);
  const [validName, setValidName] = useState<boolean>(true);
  const [uniqueName, setUniqueName] = useState<boolean>(true);
  const [validAllInput, setValidAllInput] = useState<boolean>(true);

  const [inProgress, setInProgress] = useState<boolean>(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  function clickedOpen() {
    if (!inProgress && !isOpen) {
      setIsOpen(true);
      const goodNames = metadataContext.sets.generateUniqueNames(newName, 1);
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

  function changedDescription(c:React.ChangeEvent<HTMLInputElement>) {
    const v = c.target.value;
    setDescription(v);
  }

  // If all the form data is valid and the user hits 'Enter' in the name input,
  // act as if 'Add' was pressed.
  async function nameOnKeyDown(event:React.KeyboardEvent<HTMLInputElement>) {
    if ( isOpen && !inProgress ) {
      if ((event.key == "Enter") && validAllInput) {
        pressedSubmit();
      }
    }
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
    } else if (metadataContext.sets.allValid().some((c) => c.name == trimmed)) {
      validName = false;
      uniqueName = false;
    }

    setValidQuantity(validQuantity);
    setValidName(validName);
    setUniqueName(uniqueName);
    setValidAllInput(validQuantity && validName);
  }

  async function pressedSubmit() {

    var count = Math.max(parseInt(quantity, 10), 1);
    const filteredNewName = newName.replace(/[^A-Za-z0-9\-_]/g, "_");
    var uniqueNames = metadataContext.sets.generateUniqueNames(filteredNewName, count);
    var error: string | null = null;

    setSubmitErrorMessage(null);
    setInProgress(true);
    while (count > 0 && (error === null)) {
      const result = await createNewSet(metadataContext.proposalId!, uniqueNames[count-1], description);
      if (result.success) {
        metadataContext.sets.add([result.response!]);
      } else {
        error = result.message || "";
      }
      count--;
    }
    metadataContext.changed();
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
              { validQuantity && (parseInt(quantity, 10) > 1) ?
                (<label className="label">Prefix</label>) :
                (<label className="label">Name</label>)
              }
              <div className="control has-icons-right">
                <input className={ validName ? "input" : "input is-danger" }
                  type="text"
                  placeholder="Unique name"
                  value={ newName }
                  onKeyDown={ nameOnKeyDown }
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
export default AddSets
