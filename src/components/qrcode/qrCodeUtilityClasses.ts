// Tools to generate QR codes as PNG images.
// Based on http://www.d-project.com/ , by Kazuhiko Arase, MIT licensed. 
//  http://www.opensource.org/licenses/mit-license.php
// Heavily modified and adapted for TypeScipt.
//
// The word 'QR Code' is registered trademark of DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html

import { QrEncoding, QrErrorCorrectionLevel } from './qrCodeTypes.ts';


const QrMaskPattern = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};


// Math functions to help with polynomials, e.g. QrPolynomial below
class QrMath {

	EXP_TABLE: Array<number>;
	LOG_TABLE: Array<number>;

	constructor() {
		this.EXP_TABLE = new Array(256);
		this.LOG_TABLE = new Array(256);

		// initialize tables
		for (var i = 0; i < 8; i += 1) {
			this.EXP_TABLE[i] = 1 << i;
		}
		for (var i = 8; i < 256; i += 1) {
			this.EXP_TABLE[i] = this.EXP_TABLE[i - 4]
				^ this.EXP_TABLE[i - 5]
				^ this.EXP_TABLE[i - 6]
				^ this.EXP_TABLE[i - 8];
		}
		for (var i = 0; i < 255; i += 1) {
			this.LOG_TABLE[this.EXP_TABLE[i] ] = i;
		}
	}

	glog(n: number) {
		if (n < 1) {
			throw 'glog(' + n + ')';
		}
		return this.LOG_TABLE[n];
	}

	gexp(n: number) {
		while (n < 0) { n += 255; }
		while (n >= 256) { n -= 255; }
		return this.EXP_TABLE[n];
	}
}

// Local instance for internal use
const qrMath = new QrMath();


class QrPolynomial {

	_num: number[];

	constructor (num: number[], shift: number) {
		if (typeof num.length == 'undefined') {
			throw num.length + '/' + shift;
		}

		var offset = 0;
		while (offset < num.length && num[offset] == 0) {
			offset += 1;
		}
		this._num = new Array(num.length - offset + shift);
		for (var i = 0; i < num.length - offset; i += 1) {
			this._num[i] = num[i + offset];
		}
	}


	getAt(index: number) {
		return this._num[index];
	}

	getLength() {
		return this._num.length;
	}

	multiply(e: QrPolynomial): QrPolynomial {
		var num = new Array(this.getLength() + e.getLength() - 1);

		for (var i = 0; i < this.getLength(); i += 1) {
			for (var j = 0; j < e.getLength(); j += 1) {
				num[i + j] ^= qrMath.gexp(qrMath.glog(this.getAt(i) ) + qrMath.glog(e.getAt(j) ) );
			}
		}
		return new QrPolynomial(num, 0);
	}

	mod(e: QrPolynomial): QrPolynomial {

		if (this.getLength() - e.getLength() < 0) { return this; }

		var ratio = qrMath.glog(this.getAt(0) ) - qrMath.glog(e.getAt(0) );

		var num = new Array(this.getLength() );
		for (var i = 0; i < this.getLength(); i += 1) {
			num[i] = this.getAt(i);
		}

		for (var i = 0; i < e.getLength(); i += 1) {
			num[i] ^= qrMath.gexp(qrMath.glog(e.getAt(i) ) + ratio);
		}

		// recursive call
		return new QrPolynomial(num, 0).mod(e);
	}
}


// QR Code utility class for determining structure
class QrUtil {

	PATTERN_POSITION_TABLE: number[][];
	G15: number;
	G18: number;
	G15_MASK: number;

	constructor() {

		this.PATTERN_POSITION_TABLE = [
			[],
			[6, 18],
			[6, 22],
			[6, 26],
			[6, 30],
			[6, 34],
			[6, 22, 38],
			[6, 24, 42],
			[6, 26, 46],
			[6, 28, 50],
			[6, 30, 54],
			[6, 32, 58],
			[6, 34, 62],
			[6, 26, 46, 66],
			[6, 26, 48, 70],
			[6, 26, 50, 74],
			[6, 30, 54, 78],
			[6, 30, 56, 82],
			[6, 30, 58, 86],
			[6, 34, 62, 90],
			[6, 28, 50, 72, 94],
			[6, 26, 50, 74, 98],
			[6, 30, 54, 78, 102],
			[6, 28, 54, 80, 106],
			[6, 32, 58, 84, 110],
			[6, 30, 58, 86, 114],
			[6, 34, 62, 90, 118],
			[6, 26, 50, 74, 98, 122],
			[6, 30, 54, 78, 102, 126],
			[6, 26, 52, 78, 104, 130],
			[6, 30, 56, 82, 108, 134],
			[6, 34, 60, 86, 112, 138],
			[6, 30, 58, 86, 114, 142],
			[6, 34, 62, 90, 118, 146],
			[6, 30, 54, 78, 102, 126, 150],
			[6, 24, 50, 76, 102, 128, 154],
			[6, 28, 54, 80, 106, 132, 158],
			[6, 32, 58, 84, 110, 136, 162],
			[6, 26, 54, 82, 110, 138, 166],
			[6, 30, 58, 86, 114, 142, 170]
		];

		this.G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
		this.G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
		this.G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
	}

	getBCHDigit(data: number) {
		var digit = 0;
		while (data != 0) {
			digit += 1;
			data >>>= 1;
		}
		return digit;
	}

	getBCHTypeInfo(data: number) {
		var d = data << 10;
		while (this.getBCHDigit(d) - this.getBCHDigit(this.G15) >= 0) {
			d ^= (this.G15 << (this.getBCHDigit(d) - this.getBCHDigit(this.G15) ) );
		}
		return ( (data << 10) | d) ^ this.G15_MASK;
	}

	getBCHTypeNumber(data: number) {
		var d = data << 12;
		while (this.getBCHDigit(d) - this.getBCHDigit(this.G18) >= 0) {
			d ^= (this.G18 << (this.getBCHDigit(d) - this.getBCHDigit(this.G18) ) );
		}
		return (data << 12) | d;
	}

	getPatternPosition(typeNumber: number) {
		return this.PATTERN_POSITION_TABLE[typeNumber - 1];
	}

	getMaskFunction(maskPattern: number): (i: number, j: number) => boolean {

		switch (maskPattern) {
			case QrMaskPattern.PATTERN000 :
				return function(i, j) { return (i + j) % 2 == 0; };
			case QrMaskPattern.PATTERN001 :
				return function(i, j) { return i % 2 == 0; };
			case QrMaskPattern.PATTERN010 :
				return function(i, j) { return j % 3 == 0; };
			case QrMaskPattern.PATTERN011 :
				return function(i, j) { return (i + j) % 3 == 0; };
			case QrMaskPattern.PATTERN100 :
				return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
			case QrMaskPattern.PATTERN101 :
				return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
			case QrMaskPattern.PATTERN110 :
				return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
			case QrMaskPattern.PATTERN111 :
				return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

			default :
				throw 'bad maskPattern:' + maskPattern;
		}
	}

	getErrorCorrectPolynomial(errorCorrectLength: number) {
		var a = new QrPolynomial([1], 0);
		for (var i = 0; i < errorCorrectLength; i += 1) {
			a = a.multiply(new QrPolynomial([1, qrMath.gexp(i)], 0) );
		}
		return a;
	}

	getLengthInBits(mode: QrEncoding, type: number) {

		if (1 <= type && type < 10) {
			// 1 - 9
			switch(mode) {
				case QrEncoding.Numeric      : return 10;
				case QrEncoding.Alphanumeric : return 9;
				case QrEncoding.Byte         : return 8;
				default :
				throw 'mode:' + mode;
			}

		} else if (type < 27) {
			// 10 - 26
			switch(mode) {
				case QrEncoding.Numeric      : return 12;
				case QrEncoding.Alphanumeric : return 11;
				case QrEncoding.Byte         : return 16;
				default :
				throw 'mode:' + mode;
			}

		} else if (type < 41) {
			// 27 - 40
			switch(mode) {
				case QrEncoding.Numeric      : return 14;
				case QrEncoding.Alphanumeric : return 13;
				case QrEncoding.Byte         : return 16;
				default :
				throw 'mode:' + mode;
			}

		} else {
			throw 'type:' + type;
		}
	}

	getLostPoint(moduleCount: number, isDarkFunc:(row: number, col: number) => boolean) {

		var lostPoint = 0;

		// LEVEL 1

		for (var row = 0; row < moduleCount; row += 1) {
			for (var col = 0; col < moduleCount; col += 1) {
				var sameCount = 0;
				var dark = isDarkFunc(row, col);

				for (var r = -1; r <= 1; r += 1) {
					if (row + r < 0 || moduleCount <= row + r) {
						continue;
					}

					for (var c = -1; c <= 1; c += 1) {
						if (col + c < 0 || moduleCount <= col + c) {
							continue;
						}

						if (r == 0 && c == 0) {
							continue;
						}

						if (dark == isDarkFunc(row + r, col + c) ) {
							sameCount += 1;
						}
					}
				}

				if (sameCount > 5) {
					lostPoint += (3 + sameCount - 5);
				}
			}
		}

		// LEVEL 2

		for (var row = 0; row < moduleCount - 1; row += 1) {
			for (var col = 0; col < moduleCount - 1; col += 1) {
				var count = 0;
				if (isDarkFunc(row, col) ) count += 1;
				if (isDarkFunc(row + 1, col) ) count += 1;
				if (isDarkFunc(row, col + 1) ) count += 1;
				if (isDarkFunc(row + 1, col + 1) ) count += 1;
				if (count == 0 || count == 4) {
					lostPoint += 3;
				}
			}
		}

		// LEVEL 3

		for (var row = 0; row < moduleCount; row += 1) {
			for (var col = 0; col < moduleCount - 6; col += 1) {
				if (isDarkFunc(row, col)
					&& !isDarkFunc(row, col + 1)
					&&  isDarkFunc(row, col + 2)
					&&  isDarkFunc(row, col + 3)
					&&  isDarkFunc(row, col + 4)
					&& !isDarkFunc(row, col + 5)
					&&  isDarkFunc(row, col + 6) ) {
					lostPoint += 40;
				}
			}
		}

		for (var col = 0; col < moduleCount; col += 1) {
			for (var row = 0; row < moduleCount - 6; row += 1) {
				if (isDarkFunc(row, col)
					&& !isDarkFunc(row + 1, col)
					&&  isDarkFunc(row + 2, col)
					&&  isDarkFunc(row + 3, col)
					&&  isDarkFunc(row + 4, col)
					&& !isDarkFunc(row + 5, col)
					&&  isDarkFunc(row + 6, col) ) {
					lostPoint += 40;
				}
			}
		}

		// LEVEL4

		var darkCount = 0;

		for (var col = 0; col < moduleCount; col += 1) {
			for (var row = 0; row < moduleCount; row += 1) {
				if (isDarkFunc(row, col) ) {
					darkCount += 1;
				}
			}
		}

		var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
		lostPoint += ratio * 10;

		return lostPoint;
	}
}


export { QrPolynomial, QrUtil, QrEncoding, QrErrorCorrectionLevel }
