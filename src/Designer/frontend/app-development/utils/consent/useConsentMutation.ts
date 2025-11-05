import { useConsentMutationContext } from './ConsentMutationContext';
import type { ConsentMutationContextValue } from './ConsentMutationContext';

export function useConsentMutation(): ConsentMutationContextValue {
  return useConsentMutationContext();
}
