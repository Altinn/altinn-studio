import type { PropsFromGenericComponent } from '.';

import { createContext } from 'src/core/contexts/context';
import type { IGrid } from 'src/layout/common.generated';

export interface GenericComponentOverrideDisplay {
  directRender?: true;
  renderLabel?: false;
  renderLegend?: false;
  renderedInTable?: true;
  rowReadOnly?: boolean;
}

export interface IFormComponentContext {
  baseComponentId: string | undefined;
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
export const useCurrentComponentId = () => useFormComponentCtx()?.baseComponentId;

export const FormComponentContextProvider = Provider;
