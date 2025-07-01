import React, { useState, useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import "bulma/css/bulma.min.css";

import { Guid } from "../../../components/utils.tsx";
import { MetadataContext } from "../../../metadataProvider.tsx";
import { createNewConfiguration } from "../../../metadataApi.ts";
import {
    //SampleConfiguration,
    SampleConfigurationSet,
} from "../../../sampleConfiguration.ts";
// import AddSamples from "./addSamples.tsx";

interface CloneSampleProps {
    setId: string;
    sampleId: string;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export const CloneSample: React.FC<CloneSampleProps> = ({
    setId,
    sampleId,
    trigger,
    onSuccess,
}) => {
    const metadataContext = useContext(MetadataContext);
    const [isCloning, setIsCloning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // const [newName, setNewName] = useState<string>("Sample");
    // const [scanTypeValue, setScanTypeValue] = useState<ScanType | null>(null);
    // const [description, setDescription] = useState<string>("");
    
    function getSet(): SampleConfigurationSet | undefined {
        if (!setId) {
            return undefined;
        }
        return metadataContext.sets.getById(setId as Guid);
    }

    function resetStates() {
        setIsCloning(false);
        setError(null);
    }
    const handleClone = async () => {
        if (!setId || !sampleId) return;

        setIsCloning(true);
        setError(null);

        const thisSet = getSet();
        const originalSample = thisSet?.configurationsById.get(
            sampleId as Guid
        );

        if (!thisSet || !originalSample) {
            setError("Original sample not found");
            setIsCloning(false);
            return;
        }

        console.log("Cloning Original");
        const clonedSample = thisSet.cloneSample(sampleId as Guid);
        if (!clonedSample) {
            return;
        }
        // if (clonedSample.id === originalSample.id) {
        //     console.log({
        //         "Returned clonedSample": clonedSample.id,
        //         "Original Sample: ": originalSample.id,
        //     });
        // }

        clonedSample.id = "" as Guid; // Resetting the ID to a new Guid
        //let newName = `${originalSample.name}_Copy`;;
        clonedSample.name = `${originalSample.name}_Copy`; // Setting the new name

        // console.log("Original Sample Name:", originalSample.name);
        // console.log("Cloned Sample Name:", clonedSample.name);
        // console.log("Original Sample SetID:", originalSample.setId);
        // console.log("Cloned Sample SetID:", clonedSample.setId);

        // console.log("Original Sample ID:", originalSample.id);
        // console.log("Cloned Sample ID:", clonedSample.id);
        //console.log("Original Sample ScanType:", originalSample.scanType);
        //console.log("Cloned Sample ScanType:", clonedSample.scanType);

        let count = 1;
        //let count = Math.max(parseInt(quantity, 10), 1);
        //console.log("Count for new configurations:", count);
        // These are new config objects but they don't have real Guid values.
        // Those will be added when they're round-tripped to the server below.
        //const filteredNewName = newName.replace(/[^A-Za-z0-9\-_]/g, "_");
        //console.log("Filtered New Name:", filteredNewName);
        const newConfigTemplates =
            // Generate and return an array of SampleConfiguration objects suitable for
            // sending to the server for the creation of new configurations in this set.
            // This includes creating default parameter values that respect uniqueness constraints
            // relative to the existing configurations.
            // Local version of the object for server
            thisSet.generateNewConfigurationsWithDefaults(
                count, // currently 1, could be used to implement bulk cloning
                originalSample.scanType, // ScanType of the original sample
                clonedSample.name, // New name for the cloned sample
                originalSample.description 
            );

        // console.log("New Config Templates:", newConfigTemplates);
        count = 0;
        const newConfigs = [];
        let error: string | null = null;

        while (count < newConfigTemplates.length && error === null) {
            const c = newConfigTemplates[count];
            // Create a new Sample record on the server, with sampleCharacteristics set to identify it as
            // a sample configuration.
            const result = await createNewConfiguration(
                metadataContext.proposalId!,
                c.setId,
                c.name,
                c.description,
                c.scanType,
                c.parameters
            );

            // console.log("Returned Configuration", result);
            if (result.success) {
                // console.log("New Configuration Created:", result.response);
                newConfigs.push(result.response!);
            } else {
                error = result.message || "";
            }
            count++;
        }

        thisSet.addWithHistory(newConfigs);
        metadataContext.changed();
        if (error !== null) {
            setError(error);
        } else {
            resetStates();
        }
        console.log("Cloned Sample:", newConfigs[0].id);
        // console.log("New Cloned Sample ID:", clonedSample.id);
        onSuccess?.();
    };

    return (
        <span onClick={handleClone} style={{ cursor: "pointer" }}>
            {trigger || (
                <button className="button is-small" disabled={isCloning}>
                    {isCloning ? "Cloning..." : "Clone"}
                </button>
            )}
            {error && (
                <span className="has-text-danger ml-2">
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
                </span>
            )}
        </span>
    );
};
