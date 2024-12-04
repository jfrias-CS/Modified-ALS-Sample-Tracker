// Image-based React QR code component.
// Tightly coupled to qrCode.ts
//

import { QrEncoding, QrErrorCorrectionLevel } from './qrCodeTypes.ts';
import { QrCode } from './qrCode.ts';


// Settings passed in with the React component
interface QrCodeImageParameters {
	elementId: string;
	addedClass?: string;
	pixelSize?: number;
	content: string;
	errorCorrectionLevel?: QrErrorCorrectionLevel;
}
  

function QrCodeImage(settings: QrCodeImageParameters) {

}
