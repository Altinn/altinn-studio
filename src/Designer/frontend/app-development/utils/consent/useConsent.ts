import { useConsentContext } from './ConsentContext';
import type { ConsentContextValue } from './ConsentContext';

export function useConsent(): ConsentContextValue {
  return useConsentContext();
}
