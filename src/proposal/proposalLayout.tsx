import { useEffect, PropsWithChildren } from 'react';
import { useParams, Outlet } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { SampleConfigurationProvider } from './../sampleConfigurationProvider.tsx';


const ProposalLayout: React.FC<PropsWithChildren> = () => {

  const { proposalId } = useParams();

  useEffect(() => {

    console.log('proposalLayout mounted');
    return () => {
        console.log('proposalLayout unmounted');
    };
  }, []);

  return (
    <>
      <div className="block">
        <h1 className="title">Beamline Sample Set Configuration</h1>
      </div>
      <SampleConfigurationProvider proposalId={proposalId}>
        <Outlet />
      </SampleConfigurationProvider>
    </>
  )
}

export default ProposalLayout
