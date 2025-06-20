import React, { useContext } from 'react';
import { Link, useParams } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { Guid } from "../components/utils.tsx";
import { SciCatUserDetailsContext } from '../sciCatUserDetailsProvider.tsx';
import { Groups, getGroups } from "../groups.ts";


const ProposalTable: React.FC = () => {

  var { groupId } = useParams();

  const failureResponse = (
      <div style={{padding: ".375rem 1rem"}}>
        <h1 className="title">You have not selected a valid group.  Please return to the Sample Tracker <Link to={ "/" }>home page</Link>.</h1>
      </div>
    );

  if ((groupId === undefined) || (groupId.trim() == "")) {
    return failureResponse;
  }
  const groups:Groups = getGroups();
  const group = groups.groupsById.get( groupId );
  if (!group) { return failureResponse; }

  const detailsContext = useContext(SciCatUserDetailsContext);

  const userDataGroups = detailsContext.userDetails?.profile?.accessGroups || [];
  const proposals = userDataGroups.map((g) => {
          return {
            id: g as Guid,
            name: g,
            description: "",
            sets: 0
          }
        }
      );

  return (

      <div style={{padding: ".375rem 1rem"}}>
        <h1 className="title">{group.name} Sample {group.setNameCapitalized} Tracker</h1>

        <p style={{marginBottom: "1em"}}>
          Select a Proposal below.
          For more information about the process and scan parameters for this group,
          read <a href={group.overviewUrl}>this overview</a>.
          If you have any questions, contact <a href={"mailto:" + group.contactEmail}>{group.contactName}</a>.
        </p>

        { proposals.length == 0 ? (
          <p>( You do not appear to have access to any Proposals. )</p>
        ) : (
          <>
            <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
              <ul>
                <li className="is-active"><Link to={ "/group/" + groupId }>Proposals</Link></li>
              </ul>
            </nav>

            <table className="proposals striped">
              <thead>
                <tr key="headers">
                  <th key="name" scope="col">Name</th>
                  <th key="description" scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {
                  proposals.map((proposal) => {
                    return (
                      <tr key={proposal["id"]}>
                          <th scope="row"><Link to={ "/group/" + groupId + "/proposal/" + proposal.id }>{ proposal.name }</Link></th>
                          <td>{ proposal.description }</td>
                      </tr>);
                  })
                }
              </tbody>
            </table>
          </>
        )}
      </div>
  )
}

export default ProposalTable
