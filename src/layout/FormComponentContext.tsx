import type { PropsFromGenericComponent } from '.';

import { createContext } from 'src/core/contexts/context';
import type { IGrid } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface GenericComponentOverrideDisplay {
  directRender?: true;
  renderLabel?: false;
  renderLegend?: false;
  renderedInTable?: true;
  rowReadOnly?: boolean;
}

export interface IFormComponentContext {
  id: string;
  baseComponentId: string | undefined;
  node: LayoutNode;
  grid?: IGrid;
  overrideDisplay?: GenericComponentOverrideDisplay;
  overrideItemProps?: PropsFromGenericComponent['overrideItemProps'];
}

const { Provider, useCtx } = createContext<IFormComponentContext | undefined>({
  name: 'FormComponent',
  required: false,
  default: undefined,
});

export const useFormComponentCtx = () => useCtx();
export const useCurrentNode = () => useFormComponentCtx()?.node;

export const FormComponentContextProvider = Provider;
