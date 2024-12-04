// Tools to generate QR codes as PNG images.
// Based on http://www.d-project.com/ , by Kazuhiko Arase, MIT licensed. 
//  http://www.opensource.org/licenses/mit-license.php
// Heavily modified and adapted for TypeScipt.
//
// The word 'QR Code' is registered trademark of DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html


// Error correction level to use
export enum QRErrorCorrectionLevel {
	L = "L",
	M = "M",
	Q = "Q",
	H = "H"
};


// Error correction level to use
export enum QREncoding {
	Alphanumeric = "Alphanumeric",
	Numeric = "Numeric",
	Byte = "Byte"
};


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

	getLengthInBits(mode: QREncoding, type: number) {

		if (1 <= type && type < 10) {
			// 1 - 9
			switch(mode) {
				case QREncoding.Numeric      : return 10;
				case QREncoding.Alphanumeric : return 9;
				case QREncoding.Byte         : return 8;
				default :
				throw 'mode:' + mode;
			}

		} else if (type < 27) {
			// 10 - 26
			switch(mode) {
				case QREncoding.Numeric      : return 12;
				case QREncoding.Alphanumeric : return 11;
				case QREncoding.Byte         : return 16;
				default :
				throw 'mode:' + mode;
			}

		} else if (type < 41) {
			// 27 - 40
			switch(mode) {
				case QREncoding.Numeric      : return 14;
				case QREncoding.Alphanumeric : return 13;
				case QREncoding.Byte         : return 16;
				default :
				throw 'mode:' + mode;
			}

		} else {
			throw 'type:' + type;
		}
	}

	getLostPoint(moduleCount: number, isDarkFunc:(row: number, col: number) => boolean) {

		var lostPoint = 0;

		// LEVEL1

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

		// LEVEL2

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

		// LEVEL3

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
	};
}

// Local instance for internal use
const qrUtil = new QrUtil();




// Settings passed in with the React component
interface RSBlock {
	totalCount: number;
	dataCount: number;
}


class QRRSBlock {

	RS_BLOCK_TABLE: number[][];

	constructor() {

		this.RS_BLOCK_TABLE = [
			// L
			// M
			// Q
			// H

			// 1
			[1, 26, 19],
			[1, 26, 16],
			[1, 26, 13],
			[1, 26, 9],

			// 2
			[1, 44, 34],
			[1, 44, 28],
			[1, 44, 22],
			[1, 44, 16],

			// 3
			[1, 70, 55],
			[1, 70, 44],
			[2, 35, 17],
			[2, 35, 13],

			// 4
			[1, 100, 80],
			[2, 50, 32],
			[2, 50, 24],
			[4, 25, 9],

			// 5
			[1, 134, 108],
			[2, 67, 43],
			[2, 33, 15, 2, 34, 16],
			[2, 33, 11, 2, 34, 12],

			// 6
			[2, 86, 68],
			[4, 43, 27],
			[4, 43, 19],
			[4, 43, 15],

			// 7
			[2, 98, 78],
			[4, 49, 31],
			[2, 32, 14, 4, 33, 15],
			[4, 39, 13, 1, 40, 14],

			// 8
			[2, 121, 97],
			[2, 60, 38, 2, 61, 39],
			[4, 40, 18, 2, 41, 19],
			[4, 40, 14, 2, 41, 15],

			// 9
			[2, 146, 116],
			[3, 58, 36, 2, 59, 37],
			[4, 36, 16, 4, 37, 17],
			[4, 36, 12, 4, 37, 13],

			// 10
			[2, 86, 68, 2, 87, 69],
			[4, 69, 43, 1, 70, 44],
			[6, 43, 19, 2, 44, 20],
			[6, 43, 15, 2, 44, 16],

			// 11
			[4, 101, 81],
			[1, 80, 50, 4, 81, 51],
			[4, 50, 22, 4, 51, 23],
			[3, 36, 12, 8, 37, 13],

			// 12
			[2, 116, 92, 2, 117, 93],
			[6, 58, 36, 2, 59, 37],
			[4, 46, 20, 6, 47, 21],
			[7, 42, 14, 4, 43, 15],

			// 13
			[4, 133, 107],
			[8, 59, 37, 1, 60, 38],
			[8, 44, 20, 4, 45, 21],
			[12, 33, 11, 4, 34, 12],

			// 14
			[3, 145, 115, 1, 146, 116],
			[4, 64, 40, 5, 65, 41],
			[11, 36, 16, 5, 37, 17],
			[11, 36, 12, 5, 37, 13],

			// 15
			[5, 109, 87, 1, 110, 88],
			[5, 65, 41, 5, 66, 42],
			[5, 54, 24, 7, 55, 25],
			[11, 36, 12, 7, 37, 13],

			// 16
			[5, 122, 98, 1, 123, 99],
			[7, 73, 45, 3, 74, 46],
			[15, 43, 19, 2, 44, 20],
			[3, 45, 15, 13, 46, 16],

			// 17
			[1, 135, 107, 5, 136, 108],
			[10, 74, 46, 1, 75, 47],
			[1, 50, 22, 15, 51, 23],
			[2, 42, 14, 17, 43, 15],

			// 18
			[5, 150, 120, 1, 151, 121],
			[9, 69, 43, 4, 70, 44],
			[17, 50, 22, 1, 51, 23],
			[2, 42, 14, 19, 43, 15],

			// 19
			[3, 141, 113, 4, 142, 114],
			[3, 70, 44, 11, 71, 45],
			[17, 47, 21, 4, 48, 22],
			[9, 39, 13, 16, 40, 14],

			// 20
			[3, 135, 107, 5, 136, 108],
			[3, 67, 41, 13, 68, 42],
			[15, 54, 24, 5, 55, 25],
			[15, 43, 15, 10, 44, 16],

			// 21
			[4, 144, 116, 4, 145, 117],
			[17, 68, 42],
			[17, 50, 22, 6, 51, 23],
			[19, 46, 16, 6, 47, 17],

			// 22
			[2, 139, 111, 7, 140, 112],
			[17, 74, 46],
			[7, 54, 24, 16, 55, 25],
			[34, 37, 13],

			// 23
			[4, 151, 121, 5, 152, 122],
			[4, 75, 47, 14, 76, 48],
			[11, 54, 24, 14, 55, 25],
			[16, 45, 15, 14, 46, 16],

			// 24
			[6, 147, 117, 4, 148, 118],
			[6, 73, 45, 14, 74, 46],
			[11, 54, 24, 16, 55, 25],
			[30, 46, 16, 2, 47, 17],

			// 25
			[8, 132, 106, 4, 133, 107],
			[8, 75, 47, 13, 76, 48],
			[7, 54, 24, 22, 55, 25],
			[22, 45, 15, 13, 46, 16],

			// 26
			[10, 142, 114, 2, 143, 115],
			[19, 74, 46, 4, 75, 47],
			[28, 50, 22, 6, 51, 23],
			[33, 46, 16, 4, 47, 17],

			// 27
			[8, 152, 122, 4, 153, 123],
			[22, 73, 45, 3, 74, 46],
			[8, 53, 23, 26, 54, 24],
			[12, 45, 15, 28, 46, 16],

			// 28
			[3, 147, 117, 10, 148, 118],
			[3, 73, 45, 23, 74, 46],
			[4, 54, 24, 31, 55, 25],
			[11, 45, 15, 31, 46, 16],

			// 29
			[7, 146, 116, 7, 147, 117],
			[21, 73, 45, 7, 74, 46],
			[1, 53, 23, 37, 54, 24],
			[19, 45, 15, 26, 46, 16],

			// 30
			[5, 145, 115, 10, 146, 116],
			[19, 75, 47, 10, 76, 48],
			[15, 54, 24, 25, 55, 25],
			[23, 45, 15, 25, 46, 16],

			// 31
			[13, 145, 115, 3, 146, 116],
			[2, 74, 46, 29, 75, 47],
			[42, 54, 24, 1, 55, 25],
			[23, 45, 15, 28, 46, 16],

			// 32
			[17, 145, 115],
			[10, 74, 46, 23, 75, 47],
			[10, 54, 24, 35, 55, 25],
			[19, 45, 15, 35, 46, 16],

			// 33
			[17, 145, 115, 1, 146, 116],
			[14, 74, 46, 21, 75, 47],
			[29, 54, 24, 19, 55, 25],
			[11, 45, 15, 46, 46, 16],

			// 34
			[13, 145, 115, 6, 146, 116],
			[14, 74, 46, 23, 75, 47],
			[44, 54, 24, 7, 55, 25],
			[59, 46, 16, 1, 47, 17],

			// 35
			[12, 151, 121, 7, 152, 122],
			[12, 75, 47, 26, 76, 48],
			[39, 54, 24, 14, 55, 25],
			[22, 45, 15, 41, 46, 16],

			// 36
			[6, 151, 121, 14, 152, 122],
			[6, 75, 47, 34, 76, 48],
			[46, 54, 24, 10, 55, 25],
			[2, 45, 15, 64, 46, 16],

			// 37
			[17, 152, 122, 4, 153, 123],
			[29, 74, 46, 14, 75, 47],
			[49, 54, 24, 10, 55, 25],
			[24, 45, 15, 46, 46, 16],

			// 38
			[4, 152, 122, 18, 153, 123],
			[13, 74, 46, 32, 75, 47],
			[48, 54, 24, 14, 55, 25],
			[42, 45, 15, 32, 46, 16],

			// 39
			[20, 147, 117, 4, 148, 118],
			[40, 75, 47, 7, 76, 48],
			[43, 54, 24, 22, 55, 25],
			[10, 45, 15, 67, 46, 16],

			// 40
			[19, 148, 118, 6, 149, 119],
			[18, 75, 47, 31, 76, 48],
			[34, 54, 24, 34, 55, 25],
			[20, 45, 15, 61, 46, 16]
		];
	}


    getRsBlockTable(typeNumber: number, errorCorrectionLevel: QRErrorCorrectionLevel) {

		switch(errorCorrectionLevel) {
			case QRErrorCorrectionLevel.L :
				return this.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
			case QRErrorCorrectionLevel.M :
				return this.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
			case QRErrorCorrectionLevel.Q :
				return this.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
			case QRErrorCorrectionLevel.H :
				return this.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
			default :
				return undefined;
		}
    }


    getRSBlocks(typeNumber: number, errorCorrectionLevel: QRErrorCorrectionLevel): RSBlock[] {

		var rsBlock = this.getRsBlockTable(typeNumber, errorCorrectionLevel);

		if (typeof rsBlock == 'undefined') {
			throw 'bad rs block @ typeNumber:' + typeNumber +
				'/errorCorrectionLevel:' + errorCorrectionLevel;
		}

		var length = rsBlock.length / 3;
		var list = [];
		for (var i = 0; i < length; i += 1) {
			var count = rsBlock[i * 3 + 0];
			var totalCount = rsBlock[i * 3 + 1];
			var dataCount = rsBlock[i * 3 + 2];

			for (var j = 0; j < count; j += 1) {
				list.push({ totalCount: totalCount, dataCount: dataCount} );
			}
		}
		return list;
    }
}




export class QrCode {
	_qrrsBlock: QRRSBlock;
	_errorCorrectionLevel: QRErrorCorrectionLevel;
	_typeNumber: number;
	_moduleCount: number;
	_modules: Array<Array<boolean | null> | null> | null;


	constructor (typeNumber: number, errorCorrectionLevel: QRErrorCorrectionLevel) {
		this._dataList = [];
		this._dataCache = null;
		this._qrrsBlock = new QRRSBlock();

    	this._typeNumber = typeNumber;
    	this._errorCorrectionLevel = errorCorrectionLevel;
    	this._modules = null;
    	this._moduleCount = 0;
	}


	addData(dataToAdd: string, dataType: QREncoding) {
		dataType = dataType || QREncoding.Byte;
		var newData = null;
		switch (dataType) {
			case QREncoding.Numeric:
				newData = this.generateNumericData(dataToAdd);
				break;
			case QREncoding.Alphanumeric:
				newData = this.generateAlphanumericData(dataToAdd);
				break;
			case QREncoding.Byte:
				newData = this.generateByteData(dataToAdd);
				break;
			default:
				throw "Unknown data type: " + dataType;
		}
		this._dataList.push(newData);	//	g = _dataList
		this._dataCache = null;	// s = _dataCache
	}


	generateNumericData(t: string) {
		var o = t;
		function toDigit(c: string) {
			if ("0" <= c && c <= "9")
				return c.charCodeAt(0) - "0".charCodeAt(0);
			throw "illegal char :" + c
		};

		function toDigits(input: string) {
			for (var o = 0, e = 0; e < input.length; e += 1)
				o = (10 * o) + toDigit(input.charAt(e));
			return o
		};

		var e = {
				getMode: function(): QREncoding {
					return QREncoding.Numeric;
				},
				getLength: function(t) {
					return o.length
				},
				write: function(t) {
					for (var e = o, a = 0; a + 2 < e.length;)
						t.put(toDigits(e.substring(a, a + 3)), 10),
						a += 3;
					if (a < e.length) {
						e.length - a == 1 ?
							t.put(toDigits(e.substring(a, a + 1)), 4) :
							e.length - a == 2 &&
								t.put(toDigits(e.substring(a, a + 2)), 7)
					}
				}
			};
		return e
	}


	generateAlphanumericData(t: string) {
		var o = t;
		function toAlphanumeric(t: string) {
			if ("0" <= t && t <= "9")
				return t.charCodeAt(0) - "0".charCodeAt(0);
			if ("A" <= t && t <= "Z")
				return t.charCodeAt(0) - "A".charCodeAt(0) + 10;
			if ("a" <= t && t <= "z")
				return t.charCodeAt(0) - "a".charCodeAt(0) + 10;
			switch (t) {
				case " ":
					return 36;
				case "$":
					return 37;
				case "%":
					return 38;
				case "*":
					return 39;
				case "+":
					return 40;
				case "-":
					return 41;
				case ".":
					return 42;
				case "/":
					return 43;
				case ":":
					return 44;
				default:
					throw "illegal char: " + t;
			}
		};

		var e = {
				getMode: function(): QREncoding {
					return QREncoding.Alphanumeric;
				},
				getLength: function(t) {
					return o.length
				},
				write: function(t) {
					for (var e = o, a = 0; a + 1 < e.length;)
						t.put(45 * toAlphanumeric(e.charAt(a)) + toAlphanumeric(e.charAt(a + 1)), 11),
						a += 2;
					a < e.length && t.put(toAlphanumeric(e.charAt(a)), 6)
				}
			};
		return e;
	}


	generateByteData(o: string) {

		function stringToBytes(t: string) {
			var o = [];
			for (var e = 0; e < t.length; e += 1) {
				var n = t.charCodeAt(e);
				o.push(255 & n);
			}
			return o;
		}

		function stringToBytesUTF8(str: string) {
		// http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
			var utf8 = [];
			for (var i=0; i < str.length; i++) {
				var charcode = str.charCodeAt(i);
				if (charcode < 0x80) utf8.push(charcode);
				else if (charcode < 0x800) {
				utf8.push(0xc0 | (charcode >> 6),
					0x80 | (charcode & 0x3f));
				}
				else if (charcode < 0xd800 || charcode >= 0xe000) {
				utf8.push(0xe0 | (charcode >> 12),
					0x80 | ((charcode>>6) & 0x3f),
					0x80 | (charcode & 0x3f));
				}
				// surrogate pair
				else {
				i++;
				// UTF-16 encodes 0x10000-0x10FFFF by
				// subtracting 0x10000 and splitting the
				// 20 bits of 0x0-0xFFFFF into two halves
				charcode = 0x10000 + (((charcode & 0x3ff)<<10)
					| (str.charCodeAt(i) & 0x3ff));
				utf8.push(0xf0 | (charcode >>18),
					0x80 | ((charcode>>12) & 0x3f),
					0x80 | ((charcode>>6) & 0x3f),
					0x80 | (charcode & 0x3f));
				}
			}
			return utf8;
		}

		var asBytes = stringToBytesUTF8(o);
		return {
			getMode: function(): QREncoding {
				return QREncoding.Byte;
			},
			getLength: function(t) {
				return asBytes.length;
			},
			write: function(t) {
				for (var o = 0; o < asBytes.length; o += 1)
					t.put(asBytes[o], 8)
			}
		}
	}


    makeImpl(test: boolean, maskPattern) {

		this._moduleCount = this._typeNumber * 4 + 17;
		this._modules = function(moduleCount) {
			var modules = new Array(moduleCount);
			for (var row = 0; row < moduleCount; row += 1) {
				modules[row] = new Array(moduleCount);
				for (var col = 0; col < moduleCount; col += 1) {
					modules[row][col] = null;
				}
			}
			return modules;
		}(this._moduleCount);

		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this._moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this._moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);

		if (this._typeNumber >= 7) {
			this.setupTypeNumber(test);
		}

		if (this._dataCache == null) {
			this._dataCache = this.createData(this._typeNumber, this._errorCorrectionLevel, this._dataList);
		}

		this.mapData(this._dataCache, maskPattern);
    }


    setupPositionProbePattern(row, col) {

		for (var r = -1; r <= 7; r += 1) {
			if (row + r <= -1 || this._moduleCount <= row + r) continue;

			for (var c = -1; c <= 7; c += 1) {
				if (col + c <= -1 || this._moduleCount <= col + c) continue;

				if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
					|| (0 <= c && c <= 6 && (r == 0 || r == 6) )
					|| (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this._modules[row + r][col + c] = true;
				} else {
					this._modules[row + r][col + c] = false;
				}
			}
		}
    }


    getBestMaskPattern() {
		var minLostPoint = 0;
		var pattern = 0;
		for (var i = 0; i < 8; i += 1) {

			this.makeImpl(true, i);
			var mc = this.getModuleCount();
			var isDarkFunc = this.isDark.bind(this);
			var lostPoint = qrUtil.getLostPoint(mc, isDarkFunc);
			if (i == 0 || minLostPoint > lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
		return pattern;
    }


    setupPositionAdjustPattern() {
		var pos = qrUtil.getPatternPosition(this._typeNumber);

		for (var i = 0; i < pos.length; i += 1) {
			for (var j = 0; j < pos.length; j += 1) {
				var row = pos[i];
				var col = pos[j];

				if (this._modules[row][col] != null) {
					continue;
				}

				for (var r = -2; r <= 2; r += 1) {
					for (var c = -2; c <= 2; c += 1) {
						if (r == -2 || r == 2 || c == -2 || c == 2
							|| (r == 0 && c == 0) ) {
							this._modules[row + r][col + c] = true;
						} else {
							this._modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
    }


    setupTimingPattern() {
		for (var r = 8; r < this._moduleCount - 8; r += 1) {
			if (this._modules[r][6] != null) {
				continue;
			}
			this._modules[r][6] = (r % 2 == 0);
		}

		for (var c = 8; c < this._moduleCount - 8; c += 1) {
			if (this._modules[6][c] != null) {
				continue;
			}
			this._modules[6][c] = (c % 2 == 0);
		}
    }


    setupTypeNumber(test: boolean) {
      var bits = qrUtil.getBCHTypeNumber(this._typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        this._modules[Math.floor(i / 3)][i % 3 + this._moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        this._modules[i % 3 + this._moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    }


    setupTypeInfo(test: boolean, maskPattern) {
		const ecLevelToNumber: Record<QRErrorCorrectionLevel, number> = {
			L: 1,
			M: 0,
			Q: 2,
			H: 3
		}
		
		var data = (ecLevelToNumber[this._errorCorrectionLevel] << 3) | maskPattern;
		var bits = qrUtil.getBCHTypeInfo(data);

		// vertical
		for (var i = 0; i < 15; i += 1) {
			var mod = (!test && ( (bits >> i) & 1) == 1);

			if (i < 6) {
				this._modules[i][8] = mod;
			} else if (i < 8) {
				this._modules[i + 1][8] = mod;
			} else {
				this._modules[this._moduleCount - 15 + i][8] = mod;
			}
		}

      // horizontal
	    for (var i = 0; i < 15; i += 1) {

			var mod = (!test && ( (bits >> i) & 1) == 1);

			if (i < 8) {
				this._modules[8][this._moduleCount - i - 1] = mod;
			} else if (i < 9) {
				this._modules[8][15 - i - 1 + 1] = mod;
			} else {
				this._modules[8][15 - i - 1] = mod;
			}
	      }

      // fixed module
      	this._modules[this._moduleCount - 8][8] = (!test);
    }


    mapData(data, maskPattern) {
      var inc = -1;
      var row = this._moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = qrUtil.getMaskFunction(maskPattern);

      for (var col = this._moduleCount - 1; col > 0; col -= 2) {

			if (col == 6) { col -= 1; }

			while (true) {
				for (var c = 0; c < 2; c += 1) {
					if (this._modules[row][col - c] == null) {
						var dark = false;

						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
						}

						var mask = maskFunc(row, col - c);

						if (mask) {
							dark = !dark;
						}

						this._modules[row][col - c] = dark;
						bitIndex -= 1;

						if (bitIndex == -1) {
							byteIndex += 1;
							bitIndex = 7;
						}
					}
				}

				row += inc;
				if (row < 0 || this._moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
    }


    createBytes(buffer, rsBlocks) {
		var offset = 0;

		var maxDcCount = 0;
		var maxEcCount = 0;

		var dcdata = new Array(rsBlocks.length);
		var ecdata = new Array(rsBlocks.length);

		for (var r = 0; r < rsBlocks.length; r += 1) {
			var dcCount = rsBlocks[r].dataCount;
			var ecCount = rsBlocks[r].totalCount - dcCount;

			maxDcCount = Math.max(maxDcCount, dcCount);
			maxEcCount = Math.max(maxEcCount, ecCount);

			dcdata[r] = new Array(dcCount);

			for (var i = 0; i < dcdata[r].length; i += 1) {
				dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
			}
			offset += dcCount;

			var rsPoly = qrUtil.getErrorCorrectPolynomial(ecCount);
			var rawPoly = new QrPolynomial(dcdata[r], rsPoly.getLength() - 1);

			var modPoly = rawPoly.mod(rsPoly);
			ecdata[r] = new Array(rsPoly.getLength() - 1);
			for (var i = 0; i < ecdata[r].length; i += 1) {
				var modIndex = i + modPoly.getLength() - ecdata[r].length;
				ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
			}
	    }

		var totalCodeCount = 0;
		for (var i = 0; i < rsBlocks.length; i += 1) {
			totalCodeCount += rsBlocks[i].totalCount;
		}

		var data = new Array(totalCodeCount);
		var index = 0;

		for (var i = 0; i < maxDcCount; i += 1) {
			for (var r = 0; r < rsBlocks.length; r += 1) {
				if (i < dcdata[r].length) {
					data[index] = dcdata[r][i];
					index += 1;
				}
			}
		}

		for (var i = 0; i < maxEcCount; i += 1) {
			for (var r = 0; r < rsBlocks.length; r += 1) {
				if (i < ecdata[r].length) {
					data[index] = ecdata[r][i];
					index += 1;
				}
			}
		}
		return data;
    }


    createData(typeNumber, errorCorrectionLevel: QRErrorCorrectionLevel, dataList) {
		var rsBlocks = this._qrrsBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
		var buffer = new QrCodeBitBuffer();

		for (var i = 0; i < dataList.length; i += 1) {
			var data = dataList[i];
			buffer.put(data.getMode(), 4);
			buffer.put(data.getLength(), qrUtil.getLengthInBits(data.getMode(), typeNumber) );
			data.write(buffer);
		}

		// calc num max data.
		var totalDataCount = 0;
		for (var i = 0; i < rsBlocks.length; i += 1) {
			totalDataCount += rsBlocks[i].dataCount;
		}

		if (buffer.getLengthInBits() > totalDataCount * 8) {
			throw 'code length overflow. ('
			+ buffer.getLengthInBits()
			+ '>'
			+ totalDataCount * 8
			+ ')';
		}

		// end code
		if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
			buffer.put(0, 4);
		}

		// padding
		while (buffer.getLengthInBits() % 8 != 0) {
			buffer.putBit(false);
		}

		// padding
		while (true) {
			if (buffer.getLengthInBits() >= totalDataCount * 8) {
				break;
			}
			buffer.put(0xEC, 8);

			if (buffer.getLengthInBits() >= totalDataCount * 8) {
				break;
			}
			buffer.put(0x11, 8);
		}
		return this.createBytes(buffer, rsBlocks);
    }


    isDark(row: number, col: number): boolean {
		var mc = this._moduleCount;
    	if (row < 0 || mc <= row || col < 0 || mc <= col) {
        	throw row + ',' + col;
	    }
    	return this._modules![row]![col]!;
    }


    getModuleCount() {
    	return this._moduleCount;
    }

	
	// Finds the smallest typeNumber that will contain the currrent data.
	// Returns null if the data won't fit any known type.
	guessBestTypeNumber(): number | null {
		var typeNumber = 1;

		for (; typeNumber < 40; typeNumber++) {
			var rsBlocks = this._qrrsBlock.getRSBlocks(typeNumber, this._errorCorrectionLevel);
			var buffer = new QrCodeBitBuffer();

			for (var i = 0; i < this._dataList.length; i++) {
				var data = this._dataList[i];
				buffer.put(data.getMode(), 4);
				buffer.put(data.getLength(), qrUtil.getLengthInBits(data.getMode(), typeNumber) );
				data.write(buffer);
			}

			var totalDataCount = 0;
			for (var i = 0; i < rsBlocks.length; i++) {
				totalDataCount += rsBlocks[i].dataCount;
			}
			if (buffer.getLengthInBits() <= totalDataCount * 8) {
				return typeNumber;
			}
		}
		return null;
	}


    make() {
		if (this._typeNumber < 1) {
			const t = this.guessBestTypeNumber();
			if (t === null) { return; }
			this._typeNumber = t;
		}
		var bestMaskPattern = this.getBestMaskPattern();
	    this.makeImpl(false, bestMaskPattern );
    }


	createImg(cellSize: number, margin: number) {

		cellSize = cellSize || 2;
		margin = (typeof margin == 'undefined') ? cellSize * 4 : margin;

		var moduleCount = this.getModuleCount();
		var sizeInPixels = moduleCount * cellSize + margin * 2;

        var canvas = document.createElement("canvas");
        canvas.width = sizeInPixels;
        canvas.height = sizeInPixels;

		var ctx = canvas.getContext("2d");
		if (!ctx) { throw "Cannot create context"; }

        ctx.clearRect(0, 0, sizeInPixels, sizeInPixels);

		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, sizeInPixels, sizeInPixels)

		var drawingArea = sizeInPixels - 2 * margin;
		var dotSize = Math.floor(drawingArea / moduleCount);

		var centeringOffset = Math.floor((sizeInPixels - moduleCount * dotSize) / 2);

        ctx.beginPath();
        ctx.fillStyle = ctx.strokeStyle = "#000";

        for (var x = 0; x < moduleCount; x++) {
                for (var y = 0; y < moduleCount; y++) {
					if (this.isDark(x, y)) {
							this.drawSquare(ctx, centeringOffset + x * dotSize, centeringOffset + y * dotSize, dotSize);
					}
				}
        }
        ctx.fill("evenodd");

		return canvas.toDataURL("image/png");
	}


	drawSquare(ctx: CanvasRenderingContext2D, x: number, y: number, dotSize: number) {
		var translateX = x + dotSize / 2;
		var translateY = y + dotSize / 2;

		ctx.translate(translateX, translateY);
		ctx.rect(-dotSize / 2, -dotSize / 2, dotSize, dotSize);
		ctx.closePath();
		ctx.translate(-translateX, -translateY);
	}
}


class QrCodeBitBuffer {

	_buffer: number[];
	_length: number;


	constructor () {
		this._buffer = [];
		this._length = 0;
	}

	getBuffer() {
		return this._buffer;
	}

	getAt(index: number) {
		var bufIndex = Math.floor(index / 8);
		return ( (this._buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	}

	put(num: number, length: number) {
		for (var i = 0; i < length; i += 1) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	}

	getLengthInBits() {
		return this._length;
	}

	putBit(bit: boolean) {
		var bufIndex = Math.floor(this._length / 8);
		if (this._buffer.length <= bufIndex) {
			this._buffer.push(0);
		}

		if (bit) {
			this._buffer[bufIndex] |= (0x80 >>> (this._length % 8) );
		}

		this._length += 1;
	}
}



