import { createContext, useContext } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import type { DataModel } from '../hooks/useDataModelQuery';
import type { PageLayouts, TextsById } from '../types';

/** What the parts of the builder need to know about the layout set that is open. */
export type AppBuilderData = {
  org: string;
  app: string;
  layoutSetName: string;
  /** All layout sets in the app, so deleting can check what other pages use. */
  layoutSetNames: string[];
  /** The process task the layout set belongs to, which attachment data types are tied to. */
  taskId?: string;
  layouts: PageLayouts;
  /** The pages the user fills in, in order. */
  contentPageNames: string[];
  /** The last page, which shows the answers before the user submits them. */
  summaryPageName?: string;
  /** The app's own texts in the edited language. */
  texts: TextsById;
  /** Undefined when the layout set has no data model. */
  dataModel?: DataModel;
  codeLists?: OptionListsResponse;
  prefillConfig?: PrefillConfig;
};

const AppBuilderContext = createContext<AppBuilderData | null>(null);

export function AppBuilderProvider({
  children,
  ...data
}: PropsWithChildren<AppBuilderData>): ReactElement {
  return <AppBuilderContext.Provider value={data}>{children}</AppBuilderContext.Provider>;
}

export function useAppBuilder(): AppBuilderData {
  const context = useContext(AppBuilderContext);
  if (!context) throw new Error('useAppBuilder must be used within an AppBuilderProvider.');
  return context;
}
