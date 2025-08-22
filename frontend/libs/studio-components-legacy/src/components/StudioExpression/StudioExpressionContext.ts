import { createContext, useContext } from 'react';
import type { DataLookupOptions } from './types/DataLookupOptions';
import type { ExpressionTexts } from './types/ExpressionTexts';
import type { SimpleSubexpressionValueType } from './enums/SimpleSubexpressionValueType';

export type StudioExpressionContext = {
  dataLookupOptions: Partial<DataLookupOptions>;
  texts: ExpressionTexts;
  types: SimpleSubexpressionValueType[];
};

export const StudioExpressionContext = createContext<StudioExpressionContext>(null);
export const useStudioExpressionContext = () => useContext(StudioExpressionContext);
