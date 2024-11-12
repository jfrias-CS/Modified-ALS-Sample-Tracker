import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'bulma/css/bulma.min.css';

import { SampleConfigurationProvider } from './sampleConfigurationProvider.tsx';
import HomePage from './homePage.tsx';
import ProposalLayout from "./proposal/proposalLayout.tsx";
import BarTable from "./proposal/barTable.tsx";
import SampleTable from './proposal/set/sampleTable.tsx';
import './App.css';


const App: React.FC = () => {

  return (
    <SampleConfigurationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/proposal/:proposalId/" element={<ProposalLayout />}>
            <Route index element={<BarTable />} /> 
            <Route path="set/:setId" element={<SampleTable />} />
          </Route>
        </Routes>
      </BrowserRouter>
   </SampleConfigurationProvider>
  )
}

export default App
