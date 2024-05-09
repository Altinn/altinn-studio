import { createContext, useContext } from 'react';
import type { DataLookupOptions } from './types/DataLookupOptions';
import type { ExpressionTexts } from './types/ExpressionTexts';
import { SimpleSubexpressionValueType } from './enums/SimpleSubexpressionValueType';

export type StudioExpressionContext = {
  dataLookupOptions: Partial<DataLookupOptions>;
  expressionOptions?: Array<keyof typeof SimpleSubexpressionValueType>;
  texts: ExpressionTexts;
};

export const StudioExpressionContext = createContext<StudioExpressionContext>(null);
export const useStudioExpressionContext = () => useContext(StudioExpressionContext);
