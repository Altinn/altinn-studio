import type { PropsWithChildren } from 'react';

import { Flex } from '../Flex/Flex';

/** A row of components on a form or PDF page. */
export function PageRow({ children }: PropsWithChildren) {
  return (
    <Flex container spacing={6} alignItems='flex-start'>
      {children}
    </Flex>
  );
}
