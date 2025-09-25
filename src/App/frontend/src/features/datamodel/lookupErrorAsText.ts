import type { SchemaLookupError } from 'src/features/datamodel/SimpleSchemaTraversal.tools';

type ErrorUnion = SchemaLookupError['error'];
type ErrorFromType<T extends ErrorUnion> = Extract<SchemaLookupError, { error: T }>;

type Mapping = { [key in ErrorUnion]: (err: ErrorFromType<key>) => string };
const mapping: Mapping = {
  referenceError: (err) =>
    `Ved oppslag av \`${err.fullDotNotation}\` i datamodellen stoppet oppslaget ` +
    `på \`${err.stoppedAtDotNotation}\`. Det ser ut til at referansen \`${err.reference}\` ` +
    `ikke er definert i schemaet.`,

  misCasedProperty: (err) =>
    `Ved oppslag av \`${err.fullDotNotation}\` i datamodellen ble ikke egenskapen \`${err.referencedName}\` funnet. ` +
    `Kanskje det skulle stå \`${err.actualName}\`?`,

  missingProperty: (err) => {
    const { property, mostLikelyProperty, validProperties } = err;
    if (mostLikelyProperty) {
      return (
        `Ved oppslag av \`${err.fullDotNotation}\` i datamodellen ble ikke egenskapen \`${property}\` funnet. ` +
        `Kanskje det skulle stå \`${mostLikelyProperty}\`?`
      );
    }
    return (
      `Ved oppslag av \`${err.fullDotNotation}\` i datamodellen ble ikke egenskapen \`${property}\` funnet. ` +
      `Gyldige egenskaper er: ${validProperties.join(', ')}`
    );
  },

  missingRepeatingGroup: (err) =>
    `Ved oppslag av \`${err.fullDotNotation}\` i datamodellen ser det ut til at \`${err.stoppedAtDotNotation}\` ` +
    `er definert som en repeterende gruppe, men komponenten er ikke inkludert i en repeterende ` +
    `gruppe i layout-konfigurasjonen.`,

  notAnArray: (err) =>
    `Ved oppslag av \`${err.fullDotNotation}\` i datamodellen ser det ut til at \`${err.stoppedAtDotNotation}\` ` +
    `ikke er definert som en liste. Ifølge layout-konfigurasjonen skulle denne stien være en del av en ` +
    `repeterende gruppe-struktur, men data-modellen er uenig. Faktisk type for \`${err.stoppedAtDotNotation}\` ` +
    `er \`${err.actualType}\`.`,
};

export function lookupErrorAsText(error: SchemaLookupError): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapping[error.error](error as any);
}
