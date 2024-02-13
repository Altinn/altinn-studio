import { createContext } from 'react';
import type { DataLookupOptions } from './types/DataLookupOptions';
import type { ExpressionTexts } from './types/ExpressionTexts';

export type StudioExpressionContext = {
  dataLookupOptions: DataLookupOptions;
  texts: ExpressionTexts;
};

export const StudioExpressionContext = createContext<StudioExpressionContext>(null);
