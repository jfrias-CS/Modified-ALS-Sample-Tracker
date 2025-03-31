import React, { useContext } from 'react';
import { Link } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { Guid } from "./components/utils.tsx";
import { AppConfigurationContext } from './appConfigurationProvider.tsx';
import { SciCatUserDetailsContext } from './sciCatUserDetailsProvider.tsx';
import './homePage.css';


const HomePage: React.FC = () => {

  const appConfig = useContext(AppConfigurationContext);
  const detailsContext = useContext(SciCatUserDetailsContext);

  const groups = detailsContext.userDetails?.profile?.accessGroups || [];

  const proposals = groups.map((g) => {
          return {
            id: g as Guid,
            name: g,
            description: "",
            sets: 0
          }
        }
      );

//      const proposals = [ // For testing purposes
//        {
//          id: "group1" as Guid,
//          name: "Test Proposal (group1)",
//          description: "This is a test proposal.",
//          sets: 7
//        },
//        {
//          id: "group2" as Guid,
//          name: "Test Proposal 2 (group2)",
//          description: "This is a second test proposal.",
//          sets: 0
//        }
//      ];

  return (

      <div style={{padding: ".375rem 1rem"}}>
        <h1 className="title">Beamline Sample Bar Configuration</h1>

        <p style={{marginBottom: "1em"}}>
          This application is for configuring and tracking samples scanned at Beamline 733.  To get started, select a Proposal below.
          For more information about the process and scan parameters,
          read <a href="https://docs.google.com/document/d/1tKDQnEx4kwz0xS5tZ-yk1OHG1vhdM3FsCl4iYuiQF4s/edit?tab=t.0">this overview</a>.
        </p>

        { proposals.length == 0 ? (
          <p>( You do not appear to have access to any Proposals. )</p>
        ) : (
          <>
            <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
              <ul>
                <li className="is-active"><Link to={ "/" }>Proposals</Link></li>
              </ul>
            </nav>

            <table className="proposals">
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
                          <th scope="row"><Link to={ "/proposal/" + proposal.id }>{ proposal.name }</Link></th>
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

export default HomePage
