import React from 'react';
import 'bulma/css/bulma.min.css';

import { appConfiguration } from './../appConfiguration.ts';
import { Guid } from "./../components/utils.tsx";
import { QrCodeImage } from './../components/qrcode/qrCodeImage.tsx';
import { QrEncoding, QrErrorCorrectionLevel } from './../components/qrcode/qrCodeTypes.ts';
import './setLabel.css';


// Settings passed in with the React component
interface SetLabelProps {
  setId: Guid;
  setName: string;
  proposalName: string;
}


const SetLabel: React.FC<SetLabelProps> = (props) => {

    // Note: The value in BASE_URL cannot contain underscores, or anything else outside
    // the QR alphanumeric format.  That format allows only the following:
    // Digits 0 to 9, letters A to Z (capitals only), and " ", "$", "%", "*", "+", "-", ".", "/", ":"
    const qrContent = `${import.meta.env.BASE_URL}/set/${props.setId}`.toUpperCase();

    return (
      <div className="setLabel">
        <div className="qrCode">
          <QrCodeImage size="0.4in"
            mode={QrEncoding.Alphanumeric}
            errorCorrectionLevel={QrErrorCorrectionLevel.L}
            content={qrContent} />
        </div>
        <div className="textArea">
          <div>{ props.proposalName }</div>
          <div>{ props.setName }</div>
          <div>{ props.setId }</div>
        </div>
      </div>
    )
}

export default SetLabel
