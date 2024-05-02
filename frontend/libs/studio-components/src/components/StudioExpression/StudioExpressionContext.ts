import { createContext, useContext } from 'react';
import type { DataLookupOptions } from './types/DataLookupOptions';
import type { ExpressionTexts } from './types/ExpressionTexts';

export type StudioExpressionContext = {
  dataLookupOptions: Partial<DataLookupOptions>;
  texts: ExpressionTexts;
};

export const StudioExpressionContext = createContext<StudioExpressionContext>(null);
export const useStudioExpressionContext = () => useContext(StudioExpressionContext);
