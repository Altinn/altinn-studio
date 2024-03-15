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
}

const { Provider, useCtx } = createContext<IFormComponentContext | undefined>({
  name: 'FormComponent',
  required: false,
  default: undefined,
});

export const useFormComponentCtx = () => useCtx();
export const useFormComponentCtxStrict = () => {
  const ctx = useFormComponentCtx();
  if (!ctx) {
    throw new Error('FormComponentContext not found');
  }
  return ctx;
};

export const FormComponentContextProvider = Provider;
