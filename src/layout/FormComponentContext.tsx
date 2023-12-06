import { createContext } from 'src/core/contexts/context';
import type { IGrid } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IFormComponentContext {
  id: string;
  baseComponentId: string | undefined;
  node: LayoutNode;
  grid?: IGrid;
}

const { Provider, useCtx } = createContext<IFormComponentContext | undefined>({
  name: 'FormComponent',
  required: false,
  default: undefined,
});

export const useFormComponentCtx = () => useCtx();
export const FormComponentContextProvider = Provider;
