import { PropsWithChildren } from 'react'; // Importing PropsWithChildren from React to allow the component to accept children props.
import { useParams, Outlet } from "react-router-dom"; // Importing useParams and Outlet from react-router-dom for routing and rendering nested routes.
import 'bulma/css/bulma.min.css'; // Importing Bulma CSS for styling the components.

import { GroupProvider } from './groupProvider.tsx'; // Importing GroupProvider to provide group context to the components within this layout.
import { RippleButton } from '../components/RippleButton' // Importing RippleButton component for creating buttons with ripple effect.
// GroupLayout component
// This component serves as a layout for the group-related pages in the ALS Sample Tracker application.
// Group Provider is used to provide the group context to its children components.

const GroupLayout: React.FC<PropsWithChildren> = () => {
// Example usage of useParams():
// If your route is defined as <Route path="/group/:groupId/" element={<GroupLayout />} />
// and the current URL is /group/733/,
// then useParams() will return { groupId: "733" }.
//
// const { groupId } = useParams();
// Now, groupId will be "733".
  const { groupId } = useParams(); // Extracting the groupId from the URL parameters using useParams hook. This a React Router hook that returns an object of key/value pairs of URL parameters.

  return (
    <>
      <RippleButton to="/" className="button">
  Home
</RippleButton>
      <GroupProvider groupId={groupId}>
        <Outlet />
      </GroupProvider>
    </>
  )
}

export default GroupLayout
