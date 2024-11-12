import React from 'react';
import { Link } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { Guid } from "./components/utils.tsx";
import './homePage.css';


const HomePage: React.FC = () => {

  const proposals = [
    {
      id: "1" as Guid,
      name: "Test Proposal",
      description: "This is a test proposal, generated client-side as empty.",
      bars: 0
    }
  ];


  return (

      <div style={{padding: ".375rem 1rem"}}>
        <h1 className="title">Beamline Sample Set Configuration</h1>

        <h4 className="subtitle is-4">Available Proposals</h4>

        <table className="proposals">
          <thead>
            <tr key="headers">
              <th key="name" scope="col">Name</th>
              <th key="description" scope="col">Description</th>
              <th key="samplecount" scope="col">Bars</th>
            </tr>
          </thead>
          <tbody>
            {
              proposals.map((proposal) => {
                return (
                  <tr key={proposal["id"]}>
                      <th scope="row"><Link to={ "/proposal/" + proposal.id }>{ proposal.name }</Link></th>
                      <td>{ proposal.description }</td>
                      <td>{ proposal.bars }</td>
                  </tr>);
              })
            }
          </tbody>
        </table>

      </div>
  )
}

export default HomePage
