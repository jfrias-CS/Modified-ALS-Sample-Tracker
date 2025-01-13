import React, { useState, useContext } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';

import { appConfiguration } from '../../appConfiguration.ts';
import { SampleConfigurationSet } from '../../sampleConfiguration.ts';
import { Guid } from "../../components/utils.tsx";
import { MetadataContext } from '../../metadataProvider.tsx';
import { deleteSet, deleteConfiguration } from '../../metadataApi.ts';


const DeleteSet: React.FC = () => {

  var { setId } = useParams();
  setId = setId ? setId.toLowerCase() : "";

  const metadataContext = useContext(MetadataContext);
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [inProgress, setInProgress] = useState<boolean>(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  function getSet(): SampleConfigurationSet | undefined {
    if (!setId) { return undefined; }
    return metadataContext.sets.getById(setId as Guid);
  }

  function clickedOpen() {
    const thisSet = getSet();
    if (!inProgress && !isOpen && thisSet) {
      setIsOpen(true);
    }
  }

  async function pressedSubmit() {
    const thisSet = getSet();
    if (!thisSet) { return; }

    var error: string | null = null;
    const configs = thisSet.all();

    setSubmitErrorMessage(null);
    setInProgress(true);

    var count = configs.length;
    var deletedConfigs = [];
    while (count > 0 && (error === null)) {
      const result = await deleteConfiguration(configs[count-1].id);
      if (result.success) {
        thisSet.remove([configs[count-1].id]);
        deletedConfigs.push(result.response!);
      } else {
        error = result.message || "";
      }
      count--;
    }

    // Failed to delete a Configuration?  Don't try deleting the Set.
    if (error !== null) {
      setSubmitErrorMessage(error);
      return;
    }

    const result = await deleteSet(thisSet.id);
    if (result.success) {
      metadataContext.sets.remove([result.response!]);
    } else {
      error = result.message || "";
    }
    metadataContext.changed();
    setInProgress(false);

    if (error !== null) {
      setSubmitErrorMessage(error);
    } else {
      setIsOpen(false);
      navigate('../', { relative: "route" });
    }
  };

  function clickedClose() {
    if (!inProgress && isOpen) { setSubmitErrorMessage(null); setIsOpen(false); }
  }

  return (
    <a className="dropdown-item" onClick={ clickedOpen }>Delete Bar

      <div id="modal-add-sample" className={ isOpen ? "modal is-active" : "modal" }>
        <div className="modal-background"></div>

        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Delete Bar</p>
            <button className="delete" aria-label="close" onClick={ clickedClose }></button>

          </header>
          <section className="modal-card-body">

            <div className="block">
              <p>
                Are you sure you want to delete this bar?
              </p>
              <p>
                This operation cannot be undone.
              </p>
            </div>

            <div className="buttons">
              <input
                type="button"
                className="button is-danger"
                onClick={ pressedSubmit }
                disabled={ inProgress }
                value="Delete"
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

    </a>
  )
}
export default DeleteSet
