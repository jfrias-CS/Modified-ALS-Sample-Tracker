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

interface DuplicateSampleProps {
    setId: string;
    //sampleId?: string;
    sampleIds: Set<Guid>;
   // trigger?: React.ReactNode;
    onSuccess?: () => void;
}

// NOTE: This is currently set up to return back if there is any error. Need to implement functionality to avoid this so we don't have to redo the process if there is a failure during any duplicaton
// For example, if we have a group of 5 samples, and sample 3 fails, we should step over and attempt samples 4 & 5 instead of just returning with the failure. 
// Create a new array for successful additions, then take that array and use addedwithhistory outside of for loop, and also add checks for failures. 

export const DuplicateSample: React.FC<DuplicateSampleProps> = ({
    setId,
    // sampleId,
    sampleIds,
    // trigger,
    onSuccess,
}) => {
    const metadataContext = useContext(MetadataContext);
    const [isDuplicating, setIsDuplicating] = useState(false);
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
        setIsDuplicating(false);
        setError(null);
    }
    const handleDuplicate = async () => {
        console.log("DuplicateSample handleDuplicate START. Props.sampleIds:", sampleIds ? Array.from(sampleIds) : 'undefined');
        if (!((setId && sampleIds))) {
            console.log("Could not locate setId, sampleId, or sampleIds.");
            setError("Clone could not locate setId, sampleId, or sampleIds.");
            setIsDuplicating(false);
            return;
        } 

        const thisSet = getSet();
        if (!thisSet) {
            setError("Set not found.");
            setIsDuplicating(false);
            return;
        }
     

        // Create an array to handle both single and multi-selection cases.
        let samplesToDuplicate: Guid[] =[];

        // Confirm that we have one of the necessary data options to be able to duplicate selection
        // if (sampleId) {
        //     samplesToDuplicate.push(sampleId as Guid);
        // } else 
        if (sampleIds) {
            // Convert Set into Array for easy iteration
            samplesToDuplicate = Array.from(sampleIds);
        } else {
            console.log("No sampleId or sampleIds provided for duplication");
        }
        
        setIsDuplicating(true);
        setError(null);
        
        for (const currentSampleId of samplesToDuplicate) {
            // Get current original sample
            const originalSample = thisSet?.configurationsById.get(
                currentSampleId as Guid
            );
            
            if (!originalSample) {
                setError("Original sample not found");
                setIsDuplicating(false);
                return;
            }
            
            console.log("Duplicating Original");
            // Duplicate current sample
            const duplicatedSample = thisSet.duplicateSample(currentSampleId as Guid);
            if (!duplicatedSample) {
                setError(`Failed to duplicate ${originalSample.name}`);
                setIsDuplicating(false);
                return;
            }
        
            
            duplicatedSample.id = "" as Guid; // Resetting the ID to a new Guid
            duplicatedSample.name = `${originalSample.name}_Copy`; // Setting the new name
            
                    
                    
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
                1,
                originalSample.scanType, // ScanType of the original sample
                duplicatedSample.name, // New name for the duplicated sample
                originalSample.description 
            );
            
            // console.log("New Config Templates:", newConfigTemplates);
            let count = 0;
            const newConfigs = [];
            let errorOccurred: string | null = null;
            
            while (count < newConfigTemplates.length && errorOccurred === null) {
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
                    errorOccurred = result.message || "";
                }
                count++;
            }
            
            thisSet.addWithHistory(newConfigs);
            metadataContext.changed();
            if (errorOccurred !== null) {
                setError(errorOccurred);
                setIsDuplicating(false);
                return;
            }
            console.log("Duplicated Sample:", newConfigs[0].id);
        }
        // console.log("New Duplicated Sample ID:", duplicatedSample.id);
        console.log("DuplicateSample handleDuplicate END.");
        resetStates();
        onSuccess?.();
    };

    return (
       <button className="button is-small is-outlined is-inverted delete-popup-button" 
                    onClick={handleDuplicate}
                    id="duplicateSampleButton"
                   
            >
                <span>
                    Clone{" "}
                    <strong>
                        {" "}
                        {sampleIds.size}{" "}
                    </strong> 
                    {sampleIds.size === 1 ? " Sample" : " Samples"}
                </span>
            </button>
    );
};


/* Gemini Suggestions
import React, { useState, useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import "bulma/css/bulma.min.css";

import { Guid } from "../../../components/utils.tsx";
import { MetadataContext } from "../../../metadataProvider.tsx";
import { createNewConfiguration } from "../../../metadataApi.ts";
import {
    SampleConfigurationSet,
} from "../../../sampleConfiguration.ts";

interface DuplicateSampleProps {
    setId: string;
    sampleId?: string;
    sampleIds?: Set<Guid>;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export const DuplicateSample: React.FC<DuplicateSampleProps> = ({
    setId,
    sampleId,
    sampleIds,
    trigger,
    onSuccess,
}) => {
    const metadataContext = useContext(MetadataContext);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    function getSet(): SampleConfigurationSet | undefined {
        if (!setId) {
            return undefined;
        }
        return metadataContext.sets.getById(setId as Guid);
    }

    function resetStates() {
        setIsDuplicating(false);
        setError(null);
    }

    const handleDuplicate = async () => {
        if (!((setId && sampleId) || (setId && sampleIds && sampleIds.size > 0))) { // Added size check for sampleIds
            console.log("Clone could not locate setId, sampleId, or sampleIds with valid content.");
            setError("Cannot clone: No samples selected or invalid Set ID.");
            setIsDuplicating(false);
            return;
        } 

        const thisSet = getSet();
        if (!thisSet) {
            setError("Set not found.");
            setIsDuplicating(false);
            return;
        }
     
        let samplesToDuplicate: Guid[] = [];
        const successfulSampleDuplications: any[] = []; // This will collect all successfully created config objects
        const duplicationErrors: string[] = []; // This will collect all error messages

        if (sampleId) {
            samplesToDuplicate.push(sampleId as Guid);
        } else if (sampleIds) {
            samplesToDuplicate = Array.from(sampleIds);
        } else {
            console.log("No sampleId or sampleIds provided for duplication"); // This case should be caught by initial check
            setError("No samples specified for duplication.");
            setIsDuplicating(false);
            return;
        }
        
        setIsDuplicating(true); // Set once for the whole batch operation
        setError(null);         // Clear errors once for the whole batch operation
        
        for (const currentSampleId of samplesToDuplicate) {
            let currentSampleProcessFailed = false; // Flag for this specific sample's processing
            
            const originalSample = thisSet?.configurationsById.get(currentSampleId as Guid);
            
            if (!originalSample) {
                duplicationErrors.push(`Sample ID '${currentSampleId}' not found for duplication.`);
                currentSampleProcessFailed = true;
            }
            
            let duplicatedSample;
            if (!currentSampleProcessFailed) { // Only proceed if original sample was found
                console.log(`Duplicating original: ${originalSample?.name || currentSampleId}`);
                duplicatedSample = thisSet.duplicateSample(currentSampleId as Guid); // Assuming this returns the SampleConfiguration
                if (!duplicatedSample) {
                    duplicationErrors.push(`Failed to clone data for '${originalSample?.name || currentSampleId}'.`);
                    currentSampleProcessFailed = true;
                }
            }
        
            if (!currentSampleProcessFailed) { // Only proceed if local duplication succeeded
                duplicatedSample.id = "" as Guid; // Resetting the ID to a new Guid
                duplicatedSample.name = `${originalSample.name}_Copy`; // Setting the new name
                duplicatedSample.setId = setId as Guid; // Ensure duplicated sample has the correct SetId
                
                const newConfigTemplates = thisSet.generateNewConfigurationsWithDefaults(
                    1, // Generate 1 template for this duplicated sample
                    originalSample.scanType,
                    duplicatedSample.name,
                    originalSample.description 
                );
                
                let apiErrorForCurrentSample: string | null = null;
                // Assuming newConfigTemplates will typically have one entry here
                for (const c of newConfigTemplates) { 
                    const result = await createNewConfiguration(
                        metadataContext.proposalId!,
                        c.setId,
                        c.name,
                        c.description,
                        c.scanType,
                        c.parameters
                    );
                    
                    if (result.success) {
                        // Correctly push the *single* returned config to the overall success list
                        successfulSampleDuplications.push(result.response!); 
                    } else {
                        apiErrorForCurrentSample = result.message || "";
                        break; // Break inner loop on API error for this specific sample
                    }
                }
                
                if (apiErrorForCurrentSample !== null) {
                    duplicationErrors.push(`API error creating '${originalSample?.name || currentSampleId}_Copy': ${apiErrorForCurrentSample}`);
                    // currentSampleProcessFailed remains true implicitly
                }
            }
        } // End of for loop for samplesToDuplicate

        // --- Post-Loop Actions ---

        // 1. Add all successfully created configs to history ONCE
        if (successfulSampleDuplications.length > 0) {
            thisSet.addWithHistory(successfulSampleDuplications);
            metadataContext.changed(); // Notify context of overall change
        }

        // 2. Final state update based on all collected errors
        if (duplicationErrors.length === 0) {
            resetStates(); // All clear! Success for the whole batch.
            onSuccess?.(); // Notify parent of overall success
        } else {
            // Combine all errors into one message
            setError(`Failed to duplicate some samples:\n${duplicationErrors.join("\n")}`);
            setIsDuplicating(false); // Stop duplicating, but report errors
            // Do NOT call onSuccess here, as it implies full success.
        }
    };

    return (
        <span onClick={handleDuplicate} style={{ cursor: "pointer" }}>
            {trigger || (
                <button className="button is-small" disabled={isDuplicating}>
                    {isDuplicating ? "Duplicating..." : "Duplicate"}
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
*/