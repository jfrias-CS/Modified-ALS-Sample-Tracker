import { SampleConfiguration } from '../../sampleConfiguration.ts';

export class SampleTableClipboardContent {

    content: SampleConfiguration[];
    selectedFields: Set<string>;
    selectedParameters: Set<string>;

	constructor() {
		this.content = [];
        this.selectedFields = new Set();		// List of SampleConfoguration fields that were selected during copy 
        this.selectedParameters = new Set();	// Set of Parameter IDs that were selected during copy
	}

	// Accepts an object of class LevelChanges
	fromTable(c:SampleConfiguration[], selectedFields:string[], selectedParameters:string[]) {
        this.content = c.map((oneConfig) => {
            return oneConfig.clone();
        });
        this.selectedFields = new Set(selectedFields);
        this.selectedParameters = new Set(selectedParameters);
    }

	// The object we expect from the clipboard: {
	//	  fromAlsSampleConfigureApp: true
	//    content: SampleConfiguration[]
	//    selectedColumns: string[]
	// }
	fromClipboardPasteEvent(event: React.ClipboardEvent<Element>) {
		this.content = []
        this.selectedFields = new Set(); 
        this.selectedParameters = new Set();

        // Can't get data from the event? Leave this object blank.
        if (event.clipboardData === null) { return; }

		const rawPaste = event.clipboardData.getData("text");
		// If there's any parsing error, this content didn't come from us.
		var c;
		try {
			c = JSON.parse(rawPaste);
		} catch (e) {
			return;
		}

		// If this isn't set, the content didn't come from us.
		if (!c.fromAlsSampleConfigureApp) { return; }

    	this.content = c.content;
        this.selectedFields = new Set(c.selectedFields);
        this.selectedParameters = new Set(c.selectedParameters);
	}

	isEmpty() {
		if (this.content) { return false; }
		return true;
	}

	sendToClipboard (event: React.ClipboardEvent<Element>) {

		if (this.isEmpty()) { return ; }

		const forClipboard = {
			fromAlsSampleConfigureApp: true,
			content: this.content,
			selectedFields: [...this.selectedFields],
			selectedParameters: [...this.selectedParameters]
		};

		//const asBlob = new Blob([JSON.stringify(forClipboard)], {type: 'text/plain'});
		//const item = new ClipboardItem({'text/plain': asBlob });

		event.preventDefault();
		event.clipboardData!.setData("text/json", JSON.stringify(forClipboard));
		console.log(forClipboard);

		//navigator.permissions.query({name: 'clipboard-write'}).then((result) => {
		//	if (result.state === 'granted' || result.state === 'prompt') {
		//	navigator.clipboard.write([item]).catch((ex) => { 
		//		console.log(ex) 
		//		} ); 
		//	}
		//});
	}
}
