import React from 'react';
import { Link } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { Guid } from "./components/utils.tsx";
import { QrCodeImage } from './components/qrcode/qrCodeImage.tsx';
import './homePage.css';


const HomePage: React.FC = () => {

  const proposals = [
    {
      id: "group1" as Guid,
      name: "Test Proposal (group1)",
      description: "This is a test proposal, generated client-side as empty.",
      sets: 0
    }
  ];

  return (

      <div style={{padding: ".375rem 1rem"}}>
        <h1 className="title">Beamline Sample Set Configuration</h1>

        <nav className="breadcrumb is-medium" aria-label="breadcrumbs">
          <ul>
            <li className="is-active"><Link to={ "/" }>Proposals</Link></li>
          </ul>
        </nav>

        <QrCodeImage size="5em" content="hello" />

        <table className="proposals">
          <thead>
            <tr key="headers">
              <th key="name" scope="col">Name</th>
              <th key="description" scope="col">Description</th>
              <th key="samplecount" scope="col">Sets</th>
            </tr>
          </thead>
          <tbody>
            {
              proposals.map((proposal) => {
                return (
                  <tr key={proposal["id"]}>
                      <th scope="row"><Link to={ "/proposal/" + proposal.id }>{ proposal.name }</Link></th>
                      <td>{ proposal.description }</td>
                      <td>{ proposal.sets }</td>
                  </tr>);
              })
            }
          </tbody>
        </table>

      </div>
  )
}

export default HomePage
