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

interface MisCasedProperty extends BaseError {
  error: 'misCasedProperty';
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
  | MisCasedProperty
  | NotAnArray;

const errorMap: Record<SchemaLookupError['error'], true> = {
  referenceError: true,
  missingRepeatingGroup: true,
  missingProperty: true,
  misCasedProperty: true,
  notAnArray: true,
};

export function isSchemaLookupError(error: JSONSchema7 | SchemaLookupError): error is SchemaLookupError {
  return error && 'error' in error && errorMap[error.error];
}
