import { waitFor } from '@testing-library/react';

export const verifyNeverOccurs = (fn: () => void) => expect(waitFor(fn)).rejects.toThrow();
