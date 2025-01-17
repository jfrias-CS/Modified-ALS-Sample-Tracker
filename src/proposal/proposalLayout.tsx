import { useEffect, PropsWithChildren } from 'react';
import { useParams, Outlet } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { MetadataProvider } from './../metadataProvider.tsx';


const ProposalLayout: React.FC<PropsWithChildren> = () => {

  var { proposalId } = useParams();
  proposalId = proposalId ? proposalId.toLowerCase() : "";

  useEffect(() => {

//    console.log('proposalLayout mounted');
    return () => {
//        console.log('proposalLayout unmounted');
    };
  }, []);

  return (
    <>
      <div className="block">
        <h1 className="title">Beamline Sample Bar Configuration</h1>
      </div>
      <MetadataProvider proposalId={proposalId}>
        <Outlet />
      </MetadataProvider>
    </>
  )
}

export default ProposalLayout
