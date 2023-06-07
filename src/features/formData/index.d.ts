export interface IFormDataState {
  // This is the constantly mutated object containing the current form data/data model. In key-value form.
  formData: IFormData;

  // Last saved form data. This one is a copy of the above, and will be copied from there after each save. This means
  // we can remember everything that changed, along with previous values, and pass them to the backend when we save
  // values. Do not change this unless you know what you're doing.
  lastSavedFormData: IFormData;

  // These two control the state machine for saving data. We should only perform one save/PUT request at a time, because
  // we might get back data that we have to merge into our data model (from `ProcessDataWrite`), and running multiple
  // save requests at the same time may overwrite data or cause non-atomic saves the backend does not expect. If
  // `unsavedChanges` is set it means we currently have data in `formData` that has not yet been PUT - and if `saving`
  // is set it means we're currently sending a request (so the next one, if triggered, will wait until the last save
  // has completed). At last, the saved `formData` is set into `lastSavedFormData` (after potential changes from
  // `ProcessDataWrite` on the server).
  unsavedChanges: boolean;
  saving: boolean;

  // The component IDs which triggered a submit (saving the form data in order to move to the next step)
  submittingId: string;

  error: Error | null;
}

export interface IFormData {
  [dataFieldKey: string]: string;
}
