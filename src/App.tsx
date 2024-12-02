import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'bulma/css/bulma.min.css';

import HomePage from './homePage.tsx';
import ProposalLayout from "./proposal/proposalLayout.tsx";
import SetTable from "./proposal/setTable.tsx";
import Set from './proposal/set/set.tsx';
import './App.css';


const App: React.FC = () => {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/proposal/:proposalId/" element={<ProposalLayout />}>
          <Route index element={<SetTable />} /> 
          <Route path="set/:setId" element={<Set />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
