import 'bulma/css/bulma.min.css';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './App.css'
import { SampleConfigurationProvider } from './sampleConfigurationProvider.tsx'
import HomePage from './homePage.tsx'
import ProposalLayout from "./proposalLayout.tsx"
import BarTable from "./barTable.tsx"
import SampleTable from './sampleTable.tsx'


const App: React.FC = () => {

  return (
    <SampleConfigurationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/proposal/:proposalId" element={<ProposalLayout />}>
            <Route index element={<BarTable />} /> 
            <Route path="set/:setId" element={<SampleTable />} />
          </Route>
        </Routes>
      </BrowserRouter>
   </SampleConfigurationProvider>
  )
}

export default App
