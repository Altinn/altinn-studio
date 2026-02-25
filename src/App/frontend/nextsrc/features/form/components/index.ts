import type { ComponentType, ReactNode } from 'react';

import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

export interface ComponentProps {
  component: ResolvedCompExternal;
  renderChildren: (children: ResolvedCompExternal[]) => ReactNode;
  parentBinding?: string;
  itemIndex?: number;
}

export type ComponentMap = Record<string, ComponentType<ComponentProps>>;

export { Input } from 'nextsrc/features/form/components/Input';
export { Paragraph } from 'nextsrc/features/form/components/Paragraph';
export { Button } from 'nextsrc/features/form/components/Button';
export { ButtonGroup } from 'nextsrc/features/form/components/ButtonGroup';
export { RepeatingGroup } from 'nextsrc/features/form/components/RepeatingGroup';
export { Checkboxes } from 'nextsrc/features/form/components/Checkboxes';
export { RadioButtons } from 'nextsrc/features/form/components/RadioButtons';
export { Dropdown } from 'nextsrc/features/form/components/Dropdown';
export { TextArea } from 'nextsrc/features/form/components/TextArea';
export { Datepicker } from 'nextsrc/features/form/components/Datepicker';
export { Header } from 'nextsrc/features/form/components/Header';
export { Alert } from 'nextsrc/features/form/components/Alert';
export { Number } from 'nextsrc/features/form/components/Number';
export { MultipleSelect } from 'nextsrc/features/form/components/MultipleSelect';
export { Image } from 'nextsrc/features/form/components/Image';
export { Group } from 'nextsrc/features/form/components/Group';
export { Divider } from 'nextsrc/features/form/components/Divider';
export { Link } from 'nextsrc/features/form/components/Link';
export { Panel } from 'nextsrc/features/form/components/Panel';
export { Accordion } from 'nextsrc/features/form/components/Accordion';
export { AccordionGroup } from 'nextsrc/features/form/components/AccordionGroup';
export { NavigationBar } from 'nextsrc/features/form/components/NavigationBar';
