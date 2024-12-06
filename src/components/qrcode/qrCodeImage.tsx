import { useState, useEffect, useRef } from 'react';
import { QrEncoding, QrErrorCorrectionLevel } from './qrCodeTypes.ts';
import { QrCode } from './qrCode.ts';


// Image-based React QR code component.
// Tightly coupled to qrCode.ts


// Settings passed intothe React component
interface QrCodeImageParameters {
	elementId?: string;
	addedClass?: string;
	size?: string;
	content: string;
	mode?: QrEncoding;
	errorCorrectionLevel?: QrErrorCorrectionLevel;
}
  

function QrCodeImage(settings: QrCodeImageParameters) {

  const ref = useRef<HTMLImageElement>(null);
  const [content, setContent] = useState<string>(settings.content);

  useEffect(() => {
    if (!ref.current) return;

	const trimmedContent = content.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');

	var qr = new QrCode(
		0,	// 0 means 'minimum viable size'
		settings.errorCorrectionLevel || QrErrorCorrectionLevel.M);
	qr.addData(trimmedContent, settings.mode || QrEncoding.Byte);
	qr.make();

	const cellSize = 4;
	const margin = 2;
	const qrEncoded = qr.createImg(cellSize, margin);
	ref.current.src = qrEncoded;
  }, [content, ref]);


  useEffect(() => {
	setContent(settings.content);
  }, []);

  return (
    <img ref={ref}
		 className={ settings.addedClass || "" }
		 id={ settings.elementId || "" }
         style={ {width: settings.size || "128px", height: settings.size || "128px"} }
	/>
  	);
}


export type { QrCodeImageParameters };
export { QrCodeImage };