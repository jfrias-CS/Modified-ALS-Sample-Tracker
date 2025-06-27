import { useEffect, useContext, PropsWithChildren } from 'react';
import { Link, useParams, Outlet } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { GroupContext } from '../groupProvider.tsx';
import { MetadataProvider } from '../../metadataProvider.tsx';


const ProposalLayout: React.FC<PropsWithChildren> = () => {

  var { proposalId } = useParams();
  const groupContext = useContext(GroupContext);

  return (
    <>
    <div style={{padding: ".375rem 1rem"}}>

      <div className="block do-not-print">
        <h1 className="title">{groupContext.group.name} Sample {groupContext.group.setNameCapitalized} Tracker</h1>
      </div>
      <MetadataProvider proposalId={proposalId} groupId={groupContext.group.id}>
        <Outlet />
      </MetadataProvider>
    </div>
    </>
  )
}

export default ProposalLayout
