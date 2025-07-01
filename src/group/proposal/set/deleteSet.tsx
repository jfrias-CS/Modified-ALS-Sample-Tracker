import React, { useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "bulma/css/bulma.min.css";

import {
    SampleConfiguration,
    SampleConfigurationSet,
} from "../../../sampleConfiguration.ts";
import { Guid } from "../../../components/utils.tsx";
import { MetadataContext } from "../../../metadataProvider.tsx";
import { updateConfig, updateSet } from "../../../metadataApi.ts";

interface DeleteSetProps {
    setId?: string;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

const DeleteSet: React.FC<DeleteSetProps> = ({
    setId: setIdProp,
    trigger,
    onSuccess,
}) => {
    //var { setId } = useParams();
    const routeParams = useParams(); // used to find parameters in the URL
    const setId = (setIdProp || routeParams.setId || "").toLowerCase(); // Get the setId from props or URL parameters, ensuring it's a string
    //setId = setId ? setId.toLowerCase() : "";

    const metadataContext = useContext(MetadataContext); // Access the MetadataContext to get sets and configurations
    const navigate = useNavigate(); // Used to navigate to a different route after deletion
    const [isOpen, setIsOpen] = useState<boolean>(false); // Modal open state
    const [inProgress, setInProgress] = useState<boolean>(false); // Indicates if the deletion is in progress
    const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null); // Error message for submission

    function getSet(): SampleConfigurationSet | undefined {
        if (!setId) {
            return undefined;
        }
        // console.log(metadataContext.sets.getById(setId as Guid));
        return metadataContext.sets.getById(setId as Guid); // returns a set (Bar of Samples) by the given Id
    }

    function clickedOpen() {
        const thisSet = getSet();
        if (!inProgress && !isOpen && thisSet) {
            setIsOpen(true);
        }
    }

    async function pressedSubmit() {
        const thisSet = getSet(); // thisSet is a bar of samples (set object of sampleConfigurations)
        if (!thisSet) {
            return;
        }

        var errors: string[] = [];
        //const configs = thisSet.allValid(); potential crash if no set found & no strict typed
        // Returns a set of samples that are valid || Fallback to empty array
        const configs = thisSet.allValid() || []; 
        // Maps them by ID 
        const configIds = configs.map((c) => c.id);

        setSubmitErrorMessage(null);
        setInProgress(true);

        var configDeleteSuccess = false;

        if (configIds.length == 0) {
            configDeleteSuccess = true;
        } else {
            thisSet.deleteWithHistory(configIds);
            const changes = thisSet.getPendingChanges();
            if (changes) {
                // Lists samples added or modified during the operations
                // Syncs the changes with the API
                const saveCalls = changes.changes.additions.map((e) =>
                    updateConfig(e as SampleConfiguration) // sends a PATCH request to update the sample configuration
                );
                // Prepares API calls to mark samples as "deleted".
                const deleteCalls = changes.changes.deletions.map((e) => {
                    const c = e as SampleConfiguration;
                    c.isValid = false; // soft delete
                    return updateConfig(c as SampleConfiguration);
                });

                Promise.all(saveCalls.concat(deleteCalls)).then((responses) => {
                    if (responses.every((r) => r.success)) {
                        thisSet.catchUpToEdit(changes.index);
                        configDeleteSuccess = true;
                    } else {
                        responses.forEach((r) => {
                            if (!r.success && r.message) { // Uncaught error when using result.message
                                errors.push(r.message);
                            }
                        });
                    }
                });
                metadataContext.changed();
            }
        }

        // Failed to delete a Configuration?  Don't try deleting the Set.
        if (errors.length > 0) {
            setSubmitErrorMessage(errors.join(", "));
            setInProgress(false);
            return;
        }

        thisSet.isValid = false;
        const result = await updateSet(thisSet);
        if (result.success) {
            metadataContext.sets.remove([result.response!.id]);
        } else {
            errors = [result.message || ""];
        }
        metadataContext.changed();
        setInProgress(false);

        if (errors.length > 0) {
            setSubmitErrorMessage(errors.join(", "));
        } else {
            setIsOpen(false);
            onSuccess?.();
            if (!onSuccess) {
              navigate("../", { relative: "route" });
            }
        }
    }

    function clickedClose() {
        if (!inProgress) {
            setSubmitErrorMessage(null);
            setIsOpen(false);
        }
    }

    return (
        <>
            <span onClick={clickedOpen}>
                {trigger ?? <a className="dropdown-item has-text-danger">Delete Bar</a>}
                {/* <a className="dropdown-item" onClick={ clickedOpen }>Delete Bar */}
            </span>
            <div className={isOpen ? "modal is-active" : "modal"}>
                <div className="modal-background"></div>

                <div className="modal-card">
                    <header className="modal-card-head">
                        <p className="modal-card-title">Delete Bar</p>
                        <button
                            className="delete"
                            aria-label="close"
                            onClick={clickedClose}
                        ></button>
                    </header>
                    <section className="modal-card-body">
                        <div className="block">
                            <p>Are you sure you want to delete this bar?</p>
                            <p>This operation cannot be undone.</p>
                        </div>

                        <div className="buttons">
                            <input
                                type="button"
                                className="button is-danger"
                                onClick={pressedSubmit}
                                disabled={inProgress}
                                value="Delete"
                            />
                            <button className="button" onClick={clickedClose}>
                                Cancel
                            </button>
                        </div>

                        {submitErrorMessage && (
                            <article className="message is-danger">
                                <div className="message-body">
                                    {submitErrorMessage}
                                </div>
                            </article>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
};
export default DeleteSet;
