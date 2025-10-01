import React from 'react';

import { createContext } from 'src/core/contexts/context';

const { Provider, useHasProvider } = createContext<boolean | undefined>({
  name: 'AccordionGroup',
  required: false,
  default: false,
});

export function AccordionGroupProvider({ children }: { children: React.ReactNode }) {
  return <Provider value={true}>{children}</Provider>;
}
export const useIsInAccordionGroup = () => useHasProvider();
