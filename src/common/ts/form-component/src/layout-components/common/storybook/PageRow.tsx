import type { PropsWithChildren } from 'react';

import { Flex } from '@app/form-component/app-components/Flex/Flex';

/** A row of the form page, the way the app lays out its components. */
export function PageRow({ children }: PropsWithChildren) {
  return (
    <Flex container spacing={6} alignItems='flex-start'>
      {children}
    </Flex>
  );
}
