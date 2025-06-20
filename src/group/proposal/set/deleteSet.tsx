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
    const routeParams = useParams();
    const setId = (setIdProp || routeParams.setId || "").toLowerCase();
    //setId = setId ? setId.toLowerCase() : "";

    const metadataContext = useContext(MetadataContext);
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState<boolean>(false);

    const [inProgress, setInProgress] = useState<boolean>(false);
    const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
        null
    );

    function getSet(): SampleConfigurationSet | undefined {
        if (!setId) {
            return undefined;
        }
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
        if (!thisSet) {
            return;
        }

        var errors: string[] = [];
        const configs = thisSet.allValid();
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
                const saveCalls = changes.changes.additions.map((e) =>
                    updateConfig(e as SampleConfiguration)
                );
                const deleteCalls = changes.changes.deletions.map((e) => {
                    const c = e as SampleConfiguration;
                    c.isValid = false;
                    return updateConfig(c as SampleConfiguration);
                });

                Promise.all(saveCalls.concat(deleteCalls)).then((responses) => {
                    if (responses.every((r) => r.success)) {
                        thisSet.catchUpToEdit(changes.index);
                        configDeleteSuccess = true;
                    } else {
                        responses.forEach((r) => {
                            if (!r.success && result.message) { 
                                errors.push(result.message);
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
