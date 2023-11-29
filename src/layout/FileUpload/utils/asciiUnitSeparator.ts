/**
 * Used to separate the attachment id from the error message in the validation message
 *
 * TODO: We should get rid of this, and either restructure our validation objects to account for this, or
 * use something local validation-like in the file upload component.
 *
 * @deprecated
 */
export const AsciiUnitSeparator = String.fromCharCode(31);
