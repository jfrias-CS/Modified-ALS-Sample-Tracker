import { Guid } from "./components/utils.tsx";


// For undo/redo history, we need to be manipulating objects that
// specify a unique identifier as an "id" attribute, at the very least.
export interface ObjectWithGuid {
  // A unique identifier.
  id: Guid;
}


// Represents one set of changes to content of a SampleConfigurationSet
class ChangeSet {

  preferNewer: boolean;
  additions: Array<ObjectWithGuid>;
  deletions: Array<ObjectWithGuid>;

	constructor (preferNewer: boolean) {
		this.preferNewer = preferNewer;
    this.additions = [];
    this.deletions = [];
	}

	newAddition(addition: ObjectWithGuid) {
		if (this.preferNewer) {
			// Remove any previous change before pushing.
			const c = this.additions.filter((item) => (item.id != addition.id));
			c.push(addition);
			this.additions = c;
		} else {
			// Only push the change if there isn't one for that ID already
			const s = this.additions.some((item) => (item.id == addition.id));
			if (!s) {
				this.additions.push(addition);
			}
		}
	}

  newDeletion(deletion: ObjectWithGuid) {
    // Remove any previous change before pushing.
    const c = this.deletions.filter((item) => (item.id != deletion.id));
    c.push(deletion);
    this.deletions = c;
	}

  asSelection() {
		return this.additions.map(function(item) {
	      return item.id;
		});
	}

	isEmpty() {
		if (this.additions.length > 0) { return false; }
		if (this.deletions.length > 0) { return false; }
		return true;
	}
}


// Pairs one set of changes to a SampleConfigurationSet,
// with a copy of the contents that were altered by the changes.
// These can be used to move forward and backward in the history of edits.
export class UndoHistoryEntry {

  oldChanges: ChangeSet;
  newChanges: ChangeSet;

	constructor () {
    	this.oldChanges = new ChangeSet(false);
      this.newChanges = new ChangeSet(true);
	}

  forwardAdd(addition: ObjectWithGuid) {
    this.newChanges.newAddition(addition);
  }

  forwardDelete(deletion: ObjectWithGuid) {
    this.newChanges.newDeletion(deletion);
  }

  backwardAdd(addition: ObjectWithGuid) {
    this.oldChanges.newAddition(addition);
  }

  backwardDelete(deletion: ObjectWithGuid) {
    this.oldChanges.newDeletion(deletion);
  }

  isEmpty() {
		if (!this.oldChanges.isEmpty()) { return false; }
		if (!this.newChanges.isEmpty()) { return false; }
		return true;
	}
}


export interface EditQueueEntry {
  edit: ChangeSet;
  index: number;
};


// A history of modifications to a SampleConfigurationSet.
// Contains a queue for sending modifications to a server, and stacks for undo/redo on the client.
export class UndoHistory {

  undoHistory: UndoHistoryEntry[];
  redoHistory: UndoHistoryEntry[];
  editQueue: EditQueueEntry[];
  lastEditIndex: number;


  constructor () {
		this.undoHistory = [];
		this.redoHistory = [];
    this.editQueue = [];
    this.lastEditIndex = 0;
	}

	do(entry: UndoHistoryEntry) {
		this.undoHistory.push(entry);
		// Adding a new event (as opposed to Redo-ing one) always clears the Redo stack.
	  this.newEdit(entry.newChanges);
	  this.redoHistory = [];
	}

	undo(): ChangeSet | null {
		if (this.undoHistory.length < 1) { return null; }    
    const u = this.undoHistory.pop()!;
		this.redoHistory.push(u);
    this.newEdit(u.oldChanges);
		return u.oldChanges;
	}

  redo(): ChangeSet | null {
    if (this.redoHistory.length < 1) { return null; }
    const r = this.redoHistory.pop()!;
		this.undoHistory.push(r);
    this.newEdit(r.newChanges);
		return r.newChanges;
	}

  canRedo(): boolean {
    if (this.redoHistory.length < 1) { return false; }
    return true;
  }

  canUndo(): boolean {
    if (this.undoHistory.length < 1) { return false; }
    return true;
  }

  // Internal function for adding an edit to the edit queue.
  newEdit(e: ChangeSet) {
    this.lastEditIndex++;
    const newEdit:EditQueueEntry = {
      edit: e,
      index: this.lastEditIndex
    }
    this.editQueue.push(newEdit);
  }

  getPendingEdits(): EditQueueEntry | null {
    let changes = new ChangeSet(true);

    // Nothing in the queue?  Can't get any edits.
    if (this.editQueue.length < 1) { return null; }

    // Between now and the last save, multiple entries may have appeared in the edit queue.
    // Here we run through them in the order they were added, aggregating them into one
    // large edit.

    this.editQueue.forEach((edit) => {
      edit.edit.deletions.forEach((d) => { changes.newDeletion(d); });
      edit.edit.additions.forEach((a) => { changes.newAddition(a); });
    });
    const lastEdit = this.editQueue[this.editQueue.length-1];
    return {
      edit: changes,
      index: lastEdit.index
    }
  }


  // Pulls items off the beginning of the edit queue
  // up to and including the item with the given index,
  // or just clears the whole queue is that index isn't present.
  catchUpToEdit(index:number) {
    var foundIndex = false;
    while (!foundIndex && this.editQueue.length > 0) {
      const e = this.editQueue.shift();
      if (e!.index == index) {
        foundIndex = true;
      }
    }
  }
}
