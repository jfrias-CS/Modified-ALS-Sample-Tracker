import React, { useState, useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import "bulma/css/bulma.min.css";

import { Guid } from "../../../components/utils.tsx";
import { MetadataContext } from "../../../metadataProvider.tsx";
import { createNewConfiguration } from "../../../metadataApi";
import {
    SampleConfiguration,
    SampleConfigurationSet,
} from "../../../sampleConfiguration";
import AddSamples from "./addSamples.tsx";
import { ScanType } from "../../../scanTypeDto.ts";
import { createRoutesFromElements } from "react-router-dom";

interface DuplicateSampleProps {
    setId: string;
    sampleIds: Set<Guid>;
    onSuccess?: () => void;
}

export const DuplicateSample: React.FC<DuplicateSampleProps> = ({
    setId,
    sampleIds,
    onSuccess,
}) => {
    const metadataContext = useContext(MetadataContext);
    const [displayErrors, setDisplayErrors] = useState<string[] | null>(null);

    const individualSampleErrors: string[] = [];
    let error: string = "";
    function getSet() {
        if (!setId) {
            error = "Could not retrieve Set.";
            setDisplayErrors([error]);
            return;
        }
        return metadataContext.sets.getById(setId as Guid);
    }

    async function handleDuplication() {
        // If neither setId or sampleIds are present we set error and return
        if (!(setId && sampleIds)) {
            individualSampleErrors.push("Missing SetID or SampleIds.");
            setDisplayErrors(individualSampleErrors);
            return;
        }

        const thisSet = getSet();

        if (!thisSet) {
            individualSampleErrors.push("Could not retireive set from SetID.");
            setDisplayErrors(displayErrors);
            return;
        }

        setDisplayErrors(null);

        let count = Math.max(sampleIds.size);
        
        const localClonedSamples = [];

        for (const currentSample of sampleIds) {
            // Get current sample SampleConfiguration object
            const originalSample = thisSet?.configurationsById.get(
                currentSample as Guid
            );
            console.log("Cloning:", originalSample?.name);
            if (!originalSample) {
                //setNewError("Could not retrieve sample.");
                //setIsDuplicating(false);
                individualSampleErrors.push("Could not retrieve sample.");
                continue;
            }

            // Duplicate current sample SampleConfiguration object by passing current sample Id
            const duplicatedSample = thisSet?.duplicateSample(
                currentSample as Guid
            );

            if (!duplicatedSample) {
                individualSampleErrors.push("Could not duplicate sample.");
                // setDisplayErrors("Could not duplicate sample.");
                // setIsDuplicating(false);
                continue;
            }

            duplicatedSample.id = "" as Guid; // reset id to empty string for SciCat's assignment
            duplicatedSample.name = `${originalSample.name}-copy`;
            console.log("Current / Duplicate Sample (Snapshot):", {
                currentSample,
                originalSample,
                duplicatedSample: { ...duplicatedSample }, // Creates a shallow copy at log time
            });

            // Push SampleConfiguration[0] = 1 SampleCongfiguration object into a SampleConfiguration[] object
            //localClonedSamples.push(newConfigTemplates[0]);
            localClonedSamples.push(duplicatedSample);
            console.log("localClonedSamples", {
                localClonedSamples: { ...localClonedSamples },
            });
        }
        count = 0;
        const serverClonedSamples = [];

        while (count < localClonedSamples.length) {
            // Assign c to a single SampleConfiguration form newClonedSamples[] = [SampleConfiguration1, SampleConfiguration2...]
            // and c is the current element in the array.
            const c = localClonedSamples[count];
            const result = await createNewConfiguration(
                // this returns a SampleConfiguration object
                metadataContext.proposalId!,
                c.setId,
                c.name,
                c.description,
                c.scanType,
                c.parameters
            );

            if (result.success) {
                serverClonedSamples.push(result.response!); // push new SampleConfiguration into array
                count++;
            } else {
                //error = result.message || "";
                individualSampleErrors.push(
                    `Failed to clone ${c.name}: ${result.message}`
                );
                count++;
                continue;
            }
            // count++;
        }
        // Pass newConfigs = SampleConfigurations[] object
        // [ SampleConfiguration1, SampleConfiguration2...]
        // to be added with history
        thisSet.addWithHistory(serverClonedSamples);
        metadataContext.changed();

        if (serverClonedSamples.length > 0) {
            onSuccess?.();
        }

        if (individualSampleErrors.length > 0) {
            setDisplayErrors(individualSampleErrors);
        } else if (serverClonedSamples.length) {
            setDisplayErrors(["No samples were cloned."]);
        } else {
            resetStates();
        }
    }

    function resetStates() {
        setDisplayErrors(null);
        individualSampleErrors.length = 0;
        return;
    }

    return (
        <div>
            <button
                className="button is-small is-inverted"
                onClick={handleDuplication}
                id="duplicateSampleButton"
            >
                <span>
                    Clone <strong> {sampleIds.size} </strong>
                    {sampleIds.size === 1 ? " Sample" : " Samples"}
                </span>
            </button>

            <section className="modal-card-body">
                {displayErrors && displayErrors.length > 0 && (
                    <article className="message is-danger">
                        <div className="message-body">
                            {displayErrors.map((error, index) => (
                                <p key={index}>{error}</p>
                            ))}
                        </div>
                    </article>
                )}
            </section>
        </div>
    );
};
