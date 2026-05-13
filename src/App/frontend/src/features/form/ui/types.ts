// These types should ultimately be generated from the backend DTOs, but for now we define them manually here.
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { ILayoutSettings, PageValidation } from 'src/layout/common.generated';

export type GlobalPageSettings = {
  hideCloseButton: boolean;
  showLanguageSelector: boolean;
  showExpandWidthButton: boolean;
  expandedWidth: boolean;
  showProgress: boolean;
  autoSaveBehavior: 'onChangeFormData' | 'onChangePage';
  navigationTitle: ExprValToActualOrExpr<ExprVal.String> | undefined;
  taskNavigation: (NavigationTask | NavigationReceipt)[];
  validationOnNavigation: PageValidation | undefined;
};

export type NavigationReceipt = {
  id: string;
  name?: string;
  type: 'receipt';
};

export type NavigationTask = {
  id: string;
  name?: string;
  taskId: string;
};

export type UiConfig = {
  folders: Record<string, ILayoutSettings>;
  settings?: Partial<GlobalPageSettings>;
};
