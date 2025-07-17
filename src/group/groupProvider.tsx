import { createContext, useState, useEffect, PropsWithChildren } from "react";

import { Groups, Group, groupDefaults, getGroups } from "./../groups.ts";
import { LoadingBanner, LoadingState } from './../components/loadingBanner.tsx';

// This is a "context provider" React component for providing Group information based on a Group ID.

// It uses information in groups.ts to resolve a Group ID and make
// that information available to all sub-components in the React tree.
// (See appConfiguration.ts for details.)

interface ProviderProps {
  groupId: string | undefined;
}


// The structure we are providing to components in the hierarchy below the provider
interface GroupInterface {
  groupId: string;
  group: Group;
}

const GroupContext = createContext<GroupInterface>({
                    groupId: "", 
                    group: groupDefaults // Should never be reached,
                  });

const GroupProvider: React.FC<PropsWithChildren<ProviderProps>> = (props) => {

  const failureResponse = (
    <LoadingBanner state={LoadingState.Failure} message="You have not selected a valid group.  Please return to the Sample Tracker home page."></LoadingBanner>
  );

  if ((props.groupId === undefined) || (props.groupId.trim() == "")) {
    return failureResponse;
  }
  const groups:Groups = getGroups();
  const group = groups.groupsById.get( props.groupId.trim() );
  if (!group) { return failureResponse; }

  return (
    <GroupContext.Provider value={{
      groupId: props.groupId.trim(),
      group: group
    }}>
    {props.children}
    </GroupContext.Provider>
  )
}

export { GroupContext, GroupProvider }