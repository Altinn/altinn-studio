// Self-test fixture: a typo inside an identifier must be split out and
// flagged by the production typos.toml.
export const recievedPayload = 'planted';

// A Norwegian product string: the findings typos raises inside it (the
// planted British variant, and the Norwegian words themselves) must be
// classified away by the runner — and counted, which proves typos saw them.
export const norwegianCopy = 'Velg en flavour som passer skjemaet';

// The classifier must not swallow English strings, even on a line that also
// holds a Norwegian one.
export const mixedLine = ['Dette gjelder alle felt', 'we accomodate everyone'];

// A typo embedded in a data run is data, not words — classified and counted.
export const packedToken = 'recieveAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
