import { SampleConfigurationDto, SampleConfiguration, SampleConfigurationField } from '../../sampleConfiguration.ts';
import { ParamUid } from '../../scanTypes.ts';

export class SampleTableClipboardContent {

    // SampleConfigurationDto objects representing the copied data
	content: SampleConfiguration[];
	// List of SampleConfoguration fields that were selected during copy 
    selectedFields: SampleConfigurationField[];
	// List of Parameter IDs that were selected during copy
    selectedParameters: string[];
	// If no SampleConfigurationDto objects were found on the clipboard,
	// we possibly fall back to raw text data.
	alternateTextData: string | null;

	constructor() {
		this.content = [];
        this.selectedFields = [];
        this.selectedParameters = [];
		this.alternateTextData = null;
	}

	// Accepts an object of class LevelChanges
	fromTable(c:SampleConfiguration[], selectedFields:SampleConfigurationField[], selectedParameters:string[]) {
        this.content = c.map((oneConfig) => {
            return oneConfig.clone();
        });
        this.selectedFields = selectedFields;
        this.selectedParameters = selectedParameters;
    }

	asGridOfValues():(string|null)[][] {
		const thisClipboard = this;

		if ((this.content.length == 0) && (this.alternateTextData !== null)) {
			return [[this.alternateTextData]];
		}
		var rows = this.content.map((c) => {
			// Push values for selected fields, then selected parameters, in order found.
			var row:(string|null)[] = [];
			thisClipboard.selectedFields.forEach((f) => {
				row.push(thisClipboard.getField(c, f));
			});
			thisClipboard.selectedParameters.forEach((f) => {
				row.push(thisClipboard.getParameter(c, f as ParamUid));
			});
			return row;
		});
		return rows;
	}

	getField(c:SampleConfiguration, field:SampleConfigurationField):string | null {
		var v = undefined;
		switch(field) {
			case SampleConfigurationField.Name:
				v = c.name
				break;
			case SampleConfigurationField.Description:
				v = c.description
				break;
			case SampleConfigurationField.ScanType:
				v = c.scanType
				break;
			default:
				v = c.id;
				break;
			}
		if (v === undefined) { v = null; }
		return v;
	}

	getParameter(c:SampleConfiguration, parameterName:ParamUid):string | null {
		var v = c.parameters.get(parameterName)
		if (v === undefined) { v = null; }
		return v;
	}

	// The object we expect from the clipboard: {
	//	  fromAlsSampleConfigureApp: true
	//    content: SampleConfiguration[]
	//    selectedColumns: string[]
	// }
	fromClipboardPasteEvent(event: React.ClipboardEvent<Element>) {
		this.content = [];
        this.selectedFields = []; 
        this.selectedParameters = [];
		this.alternateTextData = null;

        // Can't get data from the event? Leave this object blank.
        if (event.clipboardData === null) { return; }

		const rawPaste = event.clipboardData.getData("text/json");
		// If there's any parsing error, this content didn't come from us.
		var c;
		try {
			c = JSON.parse(rawPaste);
		} catch (e) {
			this.alternateTextData = event.clipboardData.getData("text") || null;
			return;
		}

		// If this isn't set, the content didn't come from us.
		if (!c.fromAlsSampleConfigureApp) { return; }

    	this.content = c.content.map((configDto:SampleConfigurationDto) => new SampleConfiguration(configDto));
        this.selectedFields = c.selectedFields;
        this.selectedParameters = c.selectedParameters;
	}

	isEmpty() {
		if (this.content.length == 0) { return true; }
		return false;
	}

	sendToClipboard(event: React.ClipboardEvent<Element>) {

		if (this.isEmpty()) { return ; }

		const forClipboard = {
			fromAlsSampleConfigureApp: true,
			content: this.content.map((oneConfig) => oneConfig.asDto()),
			selectedFields: this.selectedFields,
			selectedParameters: this.selectedParameters
		};

		//const asBlob = new Blob([JSON.stringify(forClipboard)], {type: 'text/plain'});
		//const item = new ClipboardItem({'text/plain': asBlob });

		event.preventDefault();
		event.clipboardData!.setData("text/json", JSON.stringify(forClipboard));

		//navigator.permissions.query({name: 'clipboard-write'}).then((result) => {
		//	if (result.state === 'granted' || result.state === 'prompt') {
		//	navigator.clipboard.write([item]).catch((ex) => { 
		//		console.log(ex) 
		//		} ); 
		//	}
		//});
	}
}
