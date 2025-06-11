import { PropsWithChildren } from 'react';
import { useParams, Outlet } from "react-router-dom";
import 'bulma/css/bulma.min.css';

import { GroupProvider } from './groupProvider.tsx';


const GroupLayout: React.FC<PropsWithChildren> = () => {

  var { groupId } = useParams();

  return (
    <>
      <GroupProvider groupId={groupId}>
        <Outlet />
      </GroupProvider>
    </>
  )
}

export default GroupLayout
