import React, { useState, useContext } from "react";
import "bulma/css/bulma.min.css";

import { Guid } from "../../../components/utils.tsx";
import { SampleConfiguration } from "../../../sampleConfiguration.ts";
import { MetadataContext } from "../../../metadataProvider.tsx";
import { config } from "@fortawesome/fontawesome-svg-core";
import { updateConfig, updateSet } from "../../../metadataApi.ts";

//import { updateConfig, updateSet } from "../../../metadataApi.ts";

/**
 * Requirements:
 * Sample name must be validated to be unique so that it can be ID to delete the correct one
 * SampleId will be name based
 *
 */

interface DeleteSampleProps {
    setId: string;
    sampleId: string;
    trigger: React.ReactNode;
    onSuccess?: () => void;
    onError?: () => void;
}

export const DeleteSample: React.FC<DeleteSampleProps> = ({
    setId,
    sampleId,
    trigger,
    onSuccess,
}) => {
    const metadataContext = useContext(MetadataContext);
    const thisSet = metadataContext.sets.getById(setId.trim() as Guid); // metadataprovider -> sets -> set of samples -> get specific set Id
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [inProgress, setInProgress] = useState<boolean>(false);
    const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
        null
    );

    function getSample(): SampleConfiguration | undefined {
        if (!sampleId) {
            return undefined;
        }
        return thisSet?.configurationsById.get(sampleId as Guid); // returns a sample object by it's ID
    }

    function clickedOpen() {
        const thisSample = getSample();
        if (!inProgress && !isOpen && thisSample) {
            setIsOpen(true);
        }
    }

    function clickedClose() {
        if (!inProgress) {
            setSubmitErrorMessage(null);
            setIsOpen(false);
        }
    }

    async function pressedSubmit() {
        // Get set
        if (!thisSet) {
            alert("Set non existent.");
            return;
        }

        const thisSample = getSample();
        if (!thisSample) {
            alert("Sample non existent.");
            return;
        }

        let errors: string[] = [];

        setSubmitErrorMessage(null);
        setInProgress(true);

        let configDeleteSuccess = true;

        thisSet.deleteWithHistory([thisSample.id]); // pass a 1 element array of the sample's id to func
        console.log("After deleteWithHistory:", {
            setSamples: Array.from(thisSet.configurationsById.values()),
            deletedSampleId: thisSample.id
        });

        const changes = thisSet.getPendingChanges(); // recover queue for changes in set
        console.log("Pending changes:", {
            deletions: changes?.changes.deletions.map(d => d.id),
            additions: changes?.changes.additions.map(a => a.id)
        });
        
        if (changes) {
            const saveCalls = changes.changes.additions.map((e) =>
                updateConfig(e as SampleConfiguration)
            );

            // Perpares API calls to mark samples as "deleted".
            const deleteCalls = changes.changes.deletions.map((e) => {
                const c = e as SampleConfiguration;
                c.isValid = false;
                return updateConfig(c as SampleConfiguration);
            });

            // Early exit if no changes to sync
            if (saveCalls.length === 0 && deleteCalls.length === 0) {
                thisSet.catchUpToEdit(changes.index); // Mark changes as synced
                setIsOpen(false);
                onSuccess?.();
                setInProgress(false);
                metadataContext.changed();
                return;
            }

            await Promise.all(saveCalls.concat(deleteCalls)).then(
                (responses) => {
                    if (responses.every((r) => r.success)) {
                        thisSet.catchUpToEdit(changes.index);
                        setIsOpen(false);
                        onSuccess?.();
                    } else {
                        responses.forEach((r) => {
                            if (!r.success && r.message) {
                                errors.push(r.message);
                            }
                        });
                        setSubmitErrorMessage(errors.join(", "));
                    }
                    configDeleteSuccess = responses.every((r) => r.success);
                }
            );
        }

        setInProgress(false);
        metadataContext.changed();
    }

    // AI Help with Code:
    // async function pressedSubmit() {
    //     if (!thisSet) {
    //         setSubmitErrorMessage("Set not found.");
    //         return;
    //     }

    //     const thisSample = getSample(); // Selected Sample Object
    //     if (!thisSample) {
    //         setSubmitErrorMessage("Sample not found.");
    //         return;
    //     }

    //     // To track errors?
    //     const errors: string[] = [];

    //     setSubmitErrorMessage(null);
    //     setInProgress(true);

    //     let sampleDeleteSuccess = false; // track success of deletion
    //     // thisSet.remove([thisSample.id]);
    //     thisSet.deleteWithHistory([thisSample.id]); // better delete option
    //     thisSample.isValid = false; // make invalid for server call
    //     const deleteCalls = [updateConfig(thisSample)]; //

    //     const responses = await Promise.all(deleteCalls); // can be used for multiple bar deletion later on

    //     if (responses.every((r) => r.success)) {
    //         sampleDeleteSuccess = true;
    //     } else {
    //         responses.forEach((r) => {
    //             if (!r.success && r.message) {
    //                 errors.push(r.message);
    //             }
    //         });
    //     }
    //     const changes = thisSet.getPendingChanges(); // collect queue of changes made to set for this set
    //     if (sampleDeleteSuccess && changes) {
    //         thisSet.catchUpToEdit(changes.index);
    //     }

    //     if (changes) {
    //         console.log("Pending deletions:", changes.changes.deletions);
    //         console.log("Pending changes", {
    //             deletions: changes?.changes.deletions.map(d => d.id),
    //             additions: changes?.changes.additions.map(a => a.id)
    //         });
    //     }

    //     setInProgress(false); // Deletion complete

    //     // Failed to delete a configuration? Don't try deleteing the Sample
    //     if (errors.length > 0 || !sampleDeleteSuccess) {
    //         setSubmitErrorMessage(errors.join(", ") || "Failed to delete sample.");
    //         return;
    //     }

    //     metadataContext.changed(); // refreshes the table
    //     setIsOpen(false);
    //     onSuccess?.();

    return (
        <>
            <span onClick={clickedOpen}>
                {trigger}
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

export default DeleteSample;
