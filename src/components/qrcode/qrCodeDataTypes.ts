// Tools to generate QR codes as PNG images.
// Based on http://www.d-project.com/ , by Kazuhiko Arase, MIT licensed. 
//  http://www.opensource.org/licenses/mit-license.php
// Heavily modified and adapted for TypeScipt.
//

import { QrEncoding } from './qrCodeUtilityClasses.ts';


interface DataWriter {
	getMode: () => QrEncoding;
	getLength: () => number;
	write: (b: QrCodeBitBuffer) => void;
}


class NumericData implements DataWriter {

	dataString: string;

	constructor(t: string) {
		this.dataString = t;
	}

	toDigit(c: string) {
		if ("0" <= c && c <= "9")
			return c.charCodeAt(0) - "0".charCodeAt(0);
		throw "Illegal  numeric QR char :" + c
	}

	toDigits(input: string) {
		for (var o = 0, e = 0; e < input.length; e += 1)
			o = (10 * o) + this.toDigit(input.charAt(e));
		return o
	};

	getMode(): QrEncoding {
		return QrEncoding.Numeric;
	}

	getLength() {
		return this.dataString.length;
	}

	write(b: QrCodeBitBuffer) {
		for (var e = this.dataString, a = 0; a + 2 < e.length;)
			b.put(this.toDigits(e.substring(a, a + 3)), 10),
			a += 3;
		if (a < e.length) {
			e.length - a == 1 ?
				b.put(this.toDigits(e.substring(a, a + 1)), 4) :
				e.length - a == 2 &&
					b.put(this.toDigits(e.substring(a, a + 2)), 7)
		}
	}
}


class AlphanumericData implements DataWriter {

	dataString: string;

	constructor(t: string) {
		this.dataString = t;
	}

	toAlphanumeric(t: string) {
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
				throw "Illegal alphanumeric QR char: " + t;
		}
	}

	getMode(): QrEncoding {
		return QrEncoding.Alphanumeric;
	}

	getLength() {
		return this.dataString.length
	}

	write(b: QrCodeBitBuffer) {
		for (var e = this.dataString, a = 0; a + 1 < e.length;)
			b.put(45 * this.toAlphanumeric(e.charAt(a)) + this.toAlphanumeric(e.charAt(a + 1)), 11),
			a += 2;
		a < e.length && b.put(this.toAlphanumeric(e.charAt(a)), 6)
	}
}


class ByteData implements DataWriter {

	dataString: string;
	asBytes: number[];
	bytesLength: number;

	constructor(t: string) {
		this.dataString = t;
		const b = this.stringToBytesUTF8(this.dataString);
		this.asBytes = b;
		this.bytesLength = b.length;
	}

	stringToBytes(t: string) {
		var o = [];
		for (var e = 0; e < t.length; e += 1) {
			var n = t.charCodeAt(e);
			o.push(255 & n);
		}
		return o;
	}

	stringToBytesUTF8(str: string) {
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

	getMode(): QrEncoding {
		return QrEncoding.Byte;
	}

	getLength() {
		return this.bytesLength;
	}

	write(b: QrCodeBitBuffer) {
		for (var o = 0; o < this.bytesLength; o += 1)
			b.put(this.asBytes[o], 8)
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


export type { DataWriter }
export { QrCodeBitBuffer, NumericData, AlphanumericData, ByteData }
