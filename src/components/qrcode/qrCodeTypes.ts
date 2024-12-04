// Tools to generate QR codes as PNG images.
// Based on http://www.d-project.com/ , by Kazuhiko Arase, MIT licensed. 
//  http://www.opensource.org/licenses/mit-license.php
// Heavily modified and adapted for TypeScipt.
//
// The word 'QR Code' is registered trademark of DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html


// Encoding formats
enum QrEncoding {
	Alphanumeric = "Alphanumeric",
	Numeric = "Numeric",
	Byte = "Byte"
};


// Error correction level to use
enum QrErrorCorrectionLevel {
	L = "L",
	M = "M",
	Q = "Q",
	H = "H"
};


export { QrEncoding, QrErrorCorrectionLevel }