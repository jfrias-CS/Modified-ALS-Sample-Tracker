import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'bulma/css/bulma.min.css';

import { AppConfigurationProvider } from './appConfigurationProvider.tsx';
import { SciCatLoginProvider } from './sciCatLoginProvider.tsx';
import { SciCatUserDetailsProvider } from './sciCatUserDetailsProvider.tsx';
import HomePage from './homePage.tsx';
import GroupLayout from "./group/groupLayout.tsx";
import ProposalLayout from "./group/proposal/proposalLayout.tsx";
import ProposalTable from "./group/proposalTable.tsx";
import SetTable from "./group/proposal/setTable.tsx";
import SetLabels from "./group/proposal/setLabels.tsx";
import Set from './group/proposal/set/set.tsx';
import './App.css';


const App: React.FC = () => {

  // You may find this annoying, but it's better to know up front:
  // The contents of "import.meta.env" are set and used at COMPILE TIME.
  // By the time your application is served in production, as a set of
  // static files by (probably) nginx, it is far too late to respond to changes.

  // The point being, if you want BrowserRouter's basename to be set to something
  // specific for your hosting needs, you need to compile it there in advance,
  // or fetch the value dynamically in the client from a configuration file in
  // a known place, e.g. config.json, _before_ you instantiate the BrowserRouter.

  // Here's the catch:  config.json needs to be served in a way that is
  // unaffected by whatever you use as the base path (and thereby basename) for this app.

  return (
    <AppConfigurationProvider>
      <SciCatLoginProvider>
        <SciCatUserDetailsProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/group/:groupId/" element={<GroupLayout />}>
                <Route index element={<ProposalTable />} />
                <Route path="proposal/:proposalId/" element={<ProposalLayout />}>
                  <Route index element={<SetTable />} />
                  <Route path="labels" element={<SetLabels />} />
                  <Route path="set/:setId" element={<Set />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </SciCatUserDetailsProvider>
      </SciCatLoginProvider>
    </AppConfigurationProvider>
  )
}

export default App

