import type { JSONSchema7 } from 'json-schema';

interface BaseError {
  fullPointer: string;
  fullDotNotation: string;
  stoppedAtPointer: string;
  stoppedAtDotNotation: string;
}

interface ReferenceError extends BaseError {
  error: 'referenceError';
  reference: string;
}

interface MissingRepeatingGroup extends BaseError {
  error: 'missingRepeatingGroup';
}

interface MissingProperty extends BaseError {
  error: 'missingProperty';
  property: string;
  mostLikelyProperty: string | undefined;
  validProperties: string[];
}

interface IncorrectlyCasedProperty extends BaseError {
  error: 'incorrectlyCasedProperty';
  referencedName: string;
  actualName: string;
}

interface NotAnArray extends BaseError {
  error: 'notAnArray';
  actualType?: string;
}

export type SchemaLookupError =
  | ReferenceError
  | MissingRepeatingGroup
  | MissingProperty
  | IncorrectlyCasedProperty
  | NotAnArray;

const errorMap: Record<SchemaLookupError['error'], true> = {
  referenceError: true,
  missingRepeatingGroup: true,
  missingProperty: true,
  incorrectlyCasedProperty: true,
  notAnArray: true,
};

export function isSchemaLookupError(error: JSONSchema7 | SchemaLookupError): error is SchemaLookupError {
  return error && 'error' in error && errorMap[error.error];
}
