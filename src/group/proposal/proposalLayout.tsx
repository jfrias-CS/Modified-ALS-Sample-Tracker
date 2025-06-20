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
      <div className="block do-not-print">
        <nav className="level">
          <div className="level-item has-text-centered">
            <img
              src={`${import.meta.env.BASE_URL}/alt_spectrum_logo-dark.png`}
              alt="The ALS Logo"
              style={{height: "2.3em", marginRight: "1em"}}
            />
            <h1 className="title">{groupContext.group.name} Sample {groupContext.group.setNameCapitalized} Tracker</h1>
          </div>
        </nav>

      </div>
      <MetadataProvider proposalId={proposalId}>
        <Outlet />
      </MetadataProvider>
    </>
  )
}

export default ProposalLayout
