import React from 'react';

import { Divider } from '@digdir/designsystemet-react';

import type { PropsFromGenericComponent } from '..';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';

export type IDividerComponent = PropsFromGenericComponent<'Divider'>;

export function DividerComponent({ node }: IDividerComponent) {
  return (
    <ComponentStructureWrapper node={node}>
      <Divider />
    </ComponentStructureWrapper>
  );
}
