import React from 'react';
import 'bulma/css/bulma.min.css';

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


const sampleBaseUrl = "http://samples.als.lbl.gov/set/";


const SetLabel: React.FC<SetLabelProps> = (props) => {

    const qrContent = `${sampleBaseUrl}${props.setId}`.toUpperCase(); 

    return (
      <div className="setLabel">
        <div className="qrCode">
          <QrCodeImage size="0.5in"
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
