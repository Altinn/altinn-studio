import type { ComponentProps, Context } from 'react';
import React, { createContext, useContext } from 'react';
import type { DataLookupOptions } from './types/DataLookupOptions';
import type { ExpressionTexts } from './types/ExpressionTexts';
import type { SimpleSubexpressionValueType } from './enums/SimpleSubexpressionValueType';

export type StudioExpressionContext = {
  dataLookupOptions: DataLookupOptions;
  texts: ExpressionTexts;
  types: SimpleSubexpressionValueType[];
};

type NullableStudioExpressionContext = StudioExpressionContext | null;

const StudioExpressionContext = createContext<NullableStudioExpressionContext>(null);

export type StudioExpressionContextProviderProps = ComponentProps<
  Context<StudioExpressionContext>['Provider']
>;

export function StudioExpressionContextProvider(
  props: StudioExpressionContextProviderProps,
): React.ReactElement {
  return <StudioExpressionContext.Provider {...props} />;
}

export const useStudioExpressionContext = (): StudioExpressionContext => {
  const context = useContext<NullableStudioExpressionContext>(StudioExpressionContext);
  if (context === null) {
    throw new Error(
      'useStudioExpressionContext must be used within StudioExpressionContextProvider.',
    );
  }
  return context;
};
