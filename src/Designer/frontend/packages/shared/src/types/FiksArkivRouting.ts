export type FiksArkivRouting = {
  successAction: string | null;
  failureAction: string | null;
  unavailableReason:
    | 'missingConfiguration'
    | 'customConfiguration'
    | 'environmentDependent'
    | 'identicalActions'
    | 'invalidConfiguration'
    | 'fetchFailed'
    | null;
};
