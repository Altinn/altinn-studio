import type { ReactNode } from 'react';
import type { ComponentType } from 'react';

import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

export interface ComponentProps {
  component: ResolvedCompExternal;
  renderChildren: (children: ResolvedCompExternal[]) => ReactNode;
}

export type ComponentMap = Record<string, ComponentType<ComponentProps>>;

export { Input } from 'nextsrc/features/form/components/Input';
export { Paragraph } from 'nextsrc/features/form/components/Paragraph';
export { Button } from 'nextsrc/features/form/components/Button';
export { ButtonGroup } from 'nextsrc/features/form/components/ButtonGroup';
export { RepeatingGroup } from 'nextsrc/features/form/components/RepeatingGroup';
