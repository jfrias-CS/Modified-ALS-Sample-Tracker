import React, { useState, useEffect, PropsWithChildren } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SizeProp } from '@fortawesome/fontawesome-svg-core';
import { faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import 'bulma/css/bulma.min.css';


// State tracking
enum LoadingState { NotStarted, Loading, Success, Failure };


// Settings passed in with the React component
interface LoadingBannerParameters {
  state: LoadingState;
  message?: string;
}


const LoadingBanner: React.FC<PropsWithChildren<LoadingBannerParameters>> = (props) => {

  // Hide everything if we're loaded.
  if (props.state == LoadingState.Success) {
    return (<></>);
  }

  var message = "";
  var icon = (<></>);
  var colorClass = "is-info";

  switch (props.state) {
    case LoadingState.NotStarted:
      message = "Please wait ";
      icon = (<FontAwesomeIcon icon={faSpinner} spin={true} />);
      colorClass = "is-dark";
      break;
    case LoadingState.NotStarted:
      message = "Loading ";
      icon = (<FontAwesomeIcon icon={faSpinner} spin={true} />);
      colorClass = "is-info";
      break;
    case LoadingState.Failure:
      message = "Error ";
      icon = (<FontAwesomeIcon icon={faExclamationTriangle} />);
      colorClass = "is-danger";
      break;
    }

  return (

    <article className={"message is-large " + colorClass}>
      <div className="message-body  has-text-centered">
        { props.message || message }
        <span style={{paddingLeft: "1em"}}>
          { icon }
        </span>
        { props.children }
        </div>
    </article>
  );
}

export { LoadingBanner, LoadingState }
