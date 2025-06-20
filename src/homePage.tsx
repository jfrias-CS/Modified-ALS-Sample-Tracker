import React, { useContext } from 'react';
import { Link } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { Groups, getGroups } from "./groups.ts";
import './homePage.css';


const HomePage: React.FC = () => {

  const groups:Groups = getGroups();

  return (

      <div style={{padding: ".375rem 1rem"}}>
        <nav className="level">
          <p className="level-item has-text-centered">
            <img
              src={`${import.meta.env.BASE_URL}/alt_spectrum_logo-dark.png`}
              alt="The ALS Logo"
              style={{height: "2.3em", marginRight: "1em"}}
            />
            <h1 className="title">ALS Sample Tracker</h1>
          </p>
        </nav>

        <p style={{marginBottom: "1em"}}>
          This application is for configuring and tracking samples at the ALS.  To get started, select a Group below.
        </p>

        { groups.groupsIdsInDisplayOrder.length == 0 ? (
          <p>( There are no Groups in the system yet. )</p>
        ) : (
          <>
            <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
              <ul>
                <li className="is-active"><Link to={ "/" }>Groups</Link></li>
              </ul>
            </nav>

            <table className="groups">
              <thead>
                <tr key="headers">
                  <th key="name" scope="col">Name</th>
                  <th key="description" scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {
                  groups.groupsIdsInDisplayOrder.map((groupId) => {
                    const group = groups.groupsById.get( groupId )!;
                    return (
                      <tr key={group["id"]}>
                          <th scope="row"><Link to={ "/group/" + group.id }>{ group.name }</Link></th>
                          <td>{ group.description }</td>
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
