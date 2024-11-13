import { useEffect, useContext, PropsWithChildren } from 'react';
import { useParams, Outlet } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { SampleConfigurationProvider, SampleConfigurationContext } from './../sampleConfigurationProvider.tsx';


const ProposalLayout: React.FC<PropsWithChildren> = (props) => {

  const { proposalId } = useParams();

  const sampleSetContext = useContext(SampleConfigurationContext);

  useEffect(() => {

    console.log('proposalLayout mounted');
    const fetchData = async () => {
      try {
        if (proposalId === undefined) { throw new Error("Project ID not defined"); }

        const p = proposalId.trim()
        if (!p) { throw new Error("Project ID is blank"); }

//        const requestInfo: RequestInfo = new Request("http://backend.localhost/api/v3/datasets", {
//              method: "GET"
          //    body: '{"proposalId": p.toString()}',
//            });

//        const response = await fetch(requestInfo);      
//        const result = await response.json();

        sampleSetContext.ingestFromServer({
          name: "Test Project",
          proposalId: proposalId,
          sets: []
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    // Call fetchData when the component mounts
    fetchData();
    console.log('Called fetchData');

    return () => {
        console.log('proposalLayout unmounted');
    };
  }, []);

  return (
    <SampleConfigurationProvider proposalId={proposalId}>
      <div style={{padding: ".375rem 1rem"}}>
        <h1 className="title">Beamline Sample Set Configuration</h1>

        { proposalId ? (<h2 className="subtitle is-2">Proposal ID { proposalId }</h2>) :
                      (<h2 className="subtitle is-2">No Proposal ID given!</h2>)
        }
        <Outlet />
      </div>
    </SampleConfigurationProvider>
  )
}

export default ProposalLayout
