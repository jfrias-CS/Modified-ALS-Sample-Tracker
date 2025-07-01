import React, { useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import "bulma/css/bulma.min.css";

import { Guid } from "../../../components/utils.tsx";
import { ScanType, ScanTypeName } from "../../../scanTypeDto.ts";
import { SampleConfigurationSet } from "../../../sampleConfiguration.ts";
import { MetadataContext } from "../../../metadataProvider.tsx";
import { SelectingStatus } from "../../../components/inputAutocomplete.tsx";
import {
    ScanTypeAutocomplete,
    ScanTypeSearchFunctions,
} from "../../../components/scanTypeAutocomplete.tsx";
import { createNewConfiguration } from "../../../metadataApi.ts";

const AddSamples: React.FC = () => {
    const { setId, groupId } = useParams();
    const metadataContext = useContext(MetadataContext);

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [newName, setNewName] = useState<string>("Sample");
    const [quantity, setQuantity] = useState<string>("1");
    const [description, setDescription] = useState<string>("");
    const [scanTypeValue, setScanTypeValue] = useState<ScanType | null>(null);

    const initialScanTypeRef = React.useRef<ScanType | null>(null); 
    // Currently we just auto-set the pulldown to the first ScanType in the display order,
    // but this will need to change on a per-beamline or per-project basis eventually.
    // const firstTypeName = metadataContext.scanTypes.typeNamesInDisplayOrder[0] || null;
    // const initialScanTypeValue = firstTypeName ? metadataContext.scanTypes.typesByName.get(firstTypeName)! : null;
    // const [scanTypeValue, setScanTypeValue] = useState<ScanType | null>(initialScanTypeValue)

    React.useEffect(() => {

        const preferredScanTypeByGroup: Record<string, string> = {
            "402": "XAS-4.0.2",
            "631": "XAS-6.3.1",
            "733": "GIWAXS",
        };
    
        // Set up default ScanType based on beamline
        if (metadataContext.scanTypes.typeNamesInDisplayOrder.length > 0) {
            const preferredScanType = groupId ? preferredScanTypeByGroup[groupId] : null;
            const initialScanTypeValue = preferredScanType ? metadataContext.scanTypes.typesByName.get(preferredScanType as ScanTypeName) : 
                metadataContext.scanTypes.typesByName.get(metadataContext.scanTypes.typeNamesInDisplayOrder[0] as ScanTypeName);
            initialScanTypeRef.current = initialScanTypeValue ?? null;
            setScanTypeValue(initialScanTypeValue ?? null);
        }
        // Only run when scan types or groupId changes
    }, [metadataContext.scanTypes, groupId]);


    const [validQuantity, setValidQuantity] = useState<boolean>(true);
    const [validName, setValidName] = useState<boolean>(true);
    const [uniqueName, setUniqueName] = useState<boolean>(true);
    const [validAllInput, setValidAllInput] = useState<boolean>(true);
    const [inProgress, setInProgress] = useState<boolean>(false);
    const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

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
            setScanTypeValue(initialScanTypeRef.current);
            const goodNames = thisSet.generateUniqueNames(newName, 1);
            setNewName(goodNames[0]);
            validate(quantity, goodNames[0], initialScanTypeRef.current);
        }
    }

    function changedQuantity(c: React.ChangeEvent<HTMLInputElement>) {
        const v = c.target.value;
        setQuantity(v);
        validate(v, newName, scanTypeValue);
    }

    function changedName(c: React.ChangeEvent<HTMLInputElement>) {
        const v = c.target.value;
        setNewName(v);
        validate(quantity, v, scanTypeValue);
    }

    function changedDescription(c: React.ChangeEvent<HTMLInputElement>) {
        const v = c.target.value;
        setDescription(v);
    }

    function validate(
        quantity: string,
        name: string,
        scanType: ScanType | null
    ) {
        let validQuantity: boolean = true;
        let validName: boolean = true;
        let uniqueName: boolean = true;

        if (parseInt(quantity, 10) < 1) {
            validQuantity = false;
        }

        const trimmed = name.toString().trim();
        if (trimmed.length < 1) {
            validName = false;
        } else {
            const thisSet = getSet();
            if (thisSet) {
                if (thisSet.allValid().some((c) => c.name == trimmed)) {
                    validName = false;
                    uniqueName = false;
                }
            }
        }

        setValidQuantity(validQuantity);
        setValidName(validName);
        setUniqueName(uniqueName);
        setValidAllInput(validQuantity && validName && scanType !== null);
    }

    async function pressedSubmit() {
        const thisSet = getSet();
        if (!thisSet) {
            return;
        }

        setSubmitErrorMessage(null);
        setInProgress(true);

        let count = Math.max(parseInt(quantity, 10), 1);
        // These are new config objects but they don't have real Guid values.
        // Those will be added when they're round-tripped to the server below.
        const filteredNewName = newName.replace(/[^A-Za-z0-9\-_]/g, "_");
        const newConfigTemplates =
            thisSet.generateNewConfigurationsWithDefaults(
                count,
                scanTypeValue!.name,
                filteredNewName,
                description
            );

        count = 0;
        const newConfigs = [];
        let error: string | null = null;

        while (count < newConfigTemplates.length && error === null) {
            const c = newConfigTemplates[count];
            const result = await createNewConfiguration(
                metadataContext.proposalId!,
                c.setId,
                c.name,
                c.description,
                c.scanType,
                c.parameters
            );

            if (result.success) {
                newConfigs.push(result.response!);
            } else {
                error = result.message || "";
            }
            count++;
        }

        thisSet.addWithHistory(newConfigs);
        metadataContext.changed();
        setInProgress(false);
        if (error !== null) {
            setSubmitErrorMessage(error);
        } else {
            resetAndClose();
        }
    }

    function resetAndClose() {
        setSubmitErrorMessage(null);
        setScanTypeValue(initialScanTypeRef.current);
        setIsOpen(false);
    }
    function clickedClose() {
        if (!inProgress && isOpen) {
            resetAndClose();
        }
    }

    const scanTypeSearchFunctions: ScanTypeSearchFunctions = {
        itemSelected: (item: ScanType) => {
            setScanTypeValue(item);
            validate(quantity, newName, item);
            return SelectingStatus.Success;
        },
        selectedNone: () => {
            setScanTypeValue(null);
            validate(quantity, newName, null);
            return SelectingStatus.Success;
        },
    };


    return (
        <div>
            <button className="button" onClick={clickedOpen}>
                Add Samples
            </button>

            <div
                id="modal-add-sample"
                className={isOpen ? "modal is-active" : "modal"}
            >
                <div className="modal-background"></div>

                <div className="modal-card">
                    <header className="modal-card-head">
                        <p className="modal-card-title">Add Samples</p>
                        <button
                            className="delete"
                            aria-label="close"
                            onClick={clickedClose}
                        ></button>
                    </header>
                    <section className="modal-card-body">
                        <div className="field">
                            <label className="label">How Many?</label>
                            <div className="control has-icons-right">
                                <input
                                    className={
                                        validQuantity
                                            ? "input"
                                            : "input is-danger"
                                    }
                                    type="number"
                                    placeholder="#"
                                    value={quantity}
                                    onChange={changedQuantity}
                                />
                                <span className="icon is-small is-right">
                                    {validQuantity || (
                                        <FontAwesomeIcon
                                            icon={faExclamationTriangle}
                                            color="darkred"
                                        />
                                    )}
                                </span>
                            </div>
                            {validQuantity || (
                                <p className="help is-danger">
                                    Must enter a number &gt; 0
                                </p>
                            )}
                        </div>

                        <div className="field">
                            {validQuantity && parseInt(quantity, 10) > 1 ? (
                                <label className="label">Prefix</label>
                            ) : (
                                <label className="label">Name</label>
                            )}
                            <div className="control has-icons-right">
                                <input
                                    className={
                                        validName ? "input" : "input is-danger"
                                    }
                                    type="text"
                                    placeholder="Unique name"
                                    value={newName}
                                    onChange={changedName}
                                />
                                <span className="icon is-small is-right">
                                    {validName || (
                                        <FontAwesomeIcon
                                            icon={faExclamationTriangle}
                                            color="darkred"
                                        />
                                    )}
                                </span>
                            </div>
                            {validName ||
                                (uniqueName ? (
                                    <p className="help is-danger">
                                        This name is invalid
                                    </p>
                                ) : (
                                    <p className="help is-danger">
                                        This name is not unique
                                    </p>
                                ))}
                        </div>

                        <div className="field">
                            <label className="label">Description</label>
                            <div className="control">
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="Optional description"
                                    value={description}
                                    onChange={changedDescription}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Scan Type</label>
                            <ScanTypeAutocomplete
                                selectedItem={scanTypeValue}
                                searchFunctions={scanTypeSearchFunctions}
                            />
                        </div>

                        <div className="buttons">
                            <input
                                type="button"
                                className="button is-success"
                                onClick={pressedSubmit}
                                disabled={inProgress || !validAllInput}
                                value="Add"
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
        </div>
    );
};
export default AddSamples;
