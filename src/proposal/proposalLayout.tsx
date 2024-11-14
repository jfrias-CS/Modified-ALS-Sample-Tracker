import { useEffect, PropsWithChildren } from 'react';
import { useParams, Outlet } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { SampleConfigurationProvider } from './../sampleConfigurationProvider.tsx';


const ProposalLayout: React.FC<PropsWithChildren> = (props) => {

  const { proposalId } = useParams();

  useEffect(() => {

    console.log('proposalLayout mounted');
    return () => {
        console.log('proposalLayout unmounted');
    };
  }, []);

  return (
    <SampleConfigurationProvider proposalId={proposalId}>
      <div style={{padding: ".375rem 1rem"}}>
        <h1 className="title">Beamline Sample Set Configuration</h1>
        <Outlet />
      </div>
    </SampleConfigurationProvider>
  )
}

export default ProposalLayout
