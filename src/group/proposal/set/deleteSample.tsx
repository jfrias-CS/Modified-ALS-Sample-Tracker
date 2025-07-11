import React, { useState, useContext } from "react";
import "bulma/css/bulma.min.css";

import { Guid } from "../../../components/utils.tsx";
import {
    SampleConfiguration,
    SampleConfigurationSet,
} from "../../../sampleConfiguration.ts";
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
    // sampleId?: string;
    sampleIds: Set<Guid>;
    // trigger: React.ReactNode;
    onSuccess?: () => void;
    onError?: () => void;
}

export const DeleteSample: React.FC<DeleteSampleProps> = ({
    setId,
    // sampleId,
    sampleIds,
    // trigger,
    onSuccess,
}) => {
    const metadataContext = useContext(MetadataContext);
    // const thisSet = metadataContext.sets.getById(setId.trim() as Guid); // metadataprovider -> sets -> set of samples -> get specific set Id
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [inProgress, setInProgress] = useState<boolean>(false);
    const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
        null
    );
    const errors: string[] = [];

    function getSet(): SampleConfigurationSet | undefined {
        if (!setId) {
            errors.push("Could not retrieve Set.");
            setSubmitErrorMessage(errors.join(", "));
            errors.length = 0;
            return;
        }
        return metadataContext?.sets.getById(setId as Guid);
    }

    function clickedOpen() {
        const thisSet = getSet();
        if (!inProgress && !isOpen && thisSet) {
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
        // Get Set
        const thisSet = getSet();
        if (!thisSet) {
            errors.push("Could not recover SetID.");
            setSubmitErrorMessage(errors.join(", "));
            errors.length = 0;
            return;
        }

        if (!sampleIds) {
            errors.push("No SampleIDS were found.");
            setSubmitErrorMessage(errors.join(", "));
            errors.length = 0;
            return;
        }

        setSubmitErrorMessage(null);
        setInProgress(true);
        let configDeleteSuccess = true;

        thisSet.deleteWithHistory(Array.from(sampleIds)); // pass selection through to function

        const changes = thisSet.getPendingChanges(); // recover queue for changes in set

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

    return (
        <>
            <button
                className="button is-small is-danger is-outlined is-inverted delete-popup-button"
                onClick={clickedOpen}
                id="deleteSampleButton"
            >
                <span>
                    Delete <strong> {sampleIds.size} </strong>
                    {sampleIds.size === 1 ? " Sample" : " Samples"}
                </span>
            </button>
            <div className={isOpen ? "modal is-active" : "modal"}>
                <div className="modal-background"></div>

                <div className="modal-card">
                    <header className="modal-card-head">
                        <p className="modal-card-title">Delete Sample</p>
                        <button
                            className="delete"
                            aria-label="close"
                            onClick={clickedClose}
                        ></button>
                    </header>
                    <section className="modal-card-body">
                        <div className="block">
                            <p>Are you sure you want to delete this sample?</p>
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
