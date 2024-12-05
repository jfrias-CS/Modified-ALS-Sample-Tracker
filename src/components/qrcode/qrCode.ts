// Tools to generate QR codes as PNG images.
// Based on http://www.d-project.com/ , by Kazuhiko Arase, MIT licensed. 
//  http://www.opensource.org/licenses/mit-license.php
// Heavily modified and adapted for TypeScipt.
//
// The word 'QR Code' is registered trademark of DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html

import { QrPolynomial, QrUtil, QrEncoding, QrErrorCorrectionLevel } from './qrCodeUtilityClasses.ts';
import { DataWriter, QrCodeBitBuffer, NumericData, AlphanumericData, ByteData } from './qrCodeDataTypes.ts';
import { QrRsBlock, RsBlock } from './qrCodeRsBlock.ts';


// Local instance for internal use
const qrUtil = new QrUtil();


export class QrCode {
	_qrrsBlock: QrRsBlock;
	_errorCorrectionLevel: QrErrorCorrectionLevel;
	_typeNumber: number;
	_moduleCount: number;
	_modules: Array<Array<boolean | null> | null> | null;
	_dataList: DataWriter[];
	_dataCache: number[] | null;


	constructor (typeNumber: number, errorCorrectionLevel: QrErrorCorrectionLevel) {
		this._dataList = [];
		this._dataCache = null;
		this._qrrsBlock = new QrRsBlock();

    	this._typeNumber = typeNumber;
    	this._errorCorrectionLevel = errorCorrectionLevel;
    	this._modules = null;
    	this._moduleCount = 0;
	}


	addData(dataToAdd: string, dataType: QrEncoding) {
		dataType = dataType || QrEncoding.Byte;
		var newData = null;
		switch (dataType) {
			case QrEncoding.Numeric:
				newData = new NumericData(dataToAdd);
				break;
			case QrEncoding.Alphanumeric:
				newData = new AlphanumericData(dataToAdd);
				break;
			case QrEncoding.Byte:
				newData = new ByteData(dataToAdd);
				break;
			default:
				throw "Unknown data type: " + dataType;
		}
		this._dataList.push(newData);	//	g = _dataList
		this._dataCache = null;	// s = _dataCache
	}


    makeImpl(test: boolean, maskPattern: number) {

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


    setupPositionProbePattern(row: number, col: number) {

		for (var r = -1; r <= 7; r += 1) {
			if (row + r <= -1 || this._moduleCount <= row + r) continue;

			for (var c = -1; c <= 7; c += 1) {
				if (col + c <= -1 || this._moduleCount <= col + c) continue;

				if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
					|| (0 <= c && c <= 6 && (r == 0 || r == 6) )
					|| (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this._modules![row + r]![col + c] = true;
				} else {
					this._modules![row + r]![col + c] = false;
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

				if (this._modules![row]![col] != null) {
					continue;
				}

				for (var r = -2; r <= 2; r += 1) {
					for (var c = -2; c <= 2; c += 1) {
						if (r == -2 || r == 2 || c == -2 || c == 2
							|| (r == 0 && c == 0) ) {
							this._modules![row + r]![col + c] = true;
						} else {
							this._modules![row + r]![col + c] = false;
						}
					}
				}
			}
		}
    }


    setupTimingPattern() {
		for (var r = 8; r < this._moduleCount - 8; r += 1) {
			if (this._modules![r]![6] != null) {
				continue;
			}
			this._modules![r]![6] = (r % 2 == 0);
		}

		for (var c = 8; c < this._moduleCount - 8; c += 1) {
			if (this._modules![6]![c] != null) {
				continue;
			}
			this._modules![6]![c] = (c % 2 == 0);
		}
    }


    setupTypeNumber(test: boolean) {
      var bits = qrUtil.getBCHTypeNumber(this._typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        this._modules![Math.floor(i / 3)]![i % 3 + this._moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        this._modules![i % 3 + this._moduleCount - 8 - 3]![Math.floor(i / 3)] = mod;
      }
    }


    setupTypeInfo(test: boolean, maskPattern: number) {
		const ecLevelToNumber: Record<QrErrorCorrectionLevel, number> = {
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
				this._modules![i]![8] = mod;
			} else if (i < 8) {
				this._modules![i + 1]![8] = mod;
			} else {
				this._modules![this._moduleCount - 15 + i]![8] = mod;
			}
		}

        // horizontal
	    for (var i = 0; i < 15; i += 1) {

			var mod = (!test && ( (bits >> i) & 1) == 1);

			if (i < 8) {
				this._modules![8]![this._moduleCount - i - 1] = mod;
			} else if (i < 9) {
				this._modules![8]![15 - i - 1 + 1] = mod;
			} else {
				this._modules![8]![15 - i - 1] = mod;
			}
	      }

        // fixed module
  	    this._modules![this._moduleCount - 8]![8] = (!test);
    }


    mapData(data: number[], maskPattern: number) {
      var inc = -1;
      var row = this._moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = qrUtil.getMaskFunction(maskPattern);

      for (var col = this._moduleCount - 1; col > 0; col -= 2) {

			if (col == 6) { col -= 1; }

			while (true) {
				for (var c = 0; c < 2; c += 1) {
					if (this._modules![row]![col - c] == null) {
						var dark = false;

						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
						}

						const mask = maskFunc(row, col - c);
						if (mask) { dark = !dark; }

						this._modules![row]![col - c] = dark;
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


    createBytes(buffer: QrCodeBitBuffer, rsBlocks: RsBlock[]): number[] {
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


    createData(typeNumber: number, errorCorrectionLevel: QrErrorCorrectionLevel, dataList: DataWriter[]): number[] {
		var rsBlocks = this._qrrsBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
		var buffer = new QrCodeBitBuffer();

		for (var i = 0; i < dataList.length; i += 1) {
			const data = dataList[i];

			const mode = data.getMode();
			var num: number = 1 << 0;
			if (mode == QrEncoding.Numeric) {      num = 1 << 0; }
			if (mode == QrEncoding.Alphanumeric) { num = 1 << 1; }
			if (mode == QrEncoding.Byte) {         num = 1 << 2; }

			buffer.put(num, 4);
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

				const mode = data.getMode();
				var num: number = 1 << 0;
				if (mode == QrEncoding.Numeric) {      num = 1 << 0; }
				if (mode == QrEncoding.Alphanumeric) { num = 1 << 1; }
				if (mode == QrEncoding.Byte) {         num = 1 << 2; }
	
				buffer.put(num, 4);
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
