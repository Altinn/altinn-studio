import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsList,
  IDataModelBindingsSimple,
  ISelectionComponent,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompFileUploadExternal
  extends ComponentBase, FormComponentProps, LabeledComponentProps, ISelectionComponent {
  type: 'FileUpload';
  textResourceBindings?: { tagTitle?: ExprValToActualOrExpr<ExprVal.String> } & TRBFormComp &
    TRBLabel &
    TRBSummarizable;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsSimple | IDataModelBindingsList;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: ExprValToActualOrExpr<ExprVal.Number>;
  minNumberOfAttachments: ExprValToActualOrExpr<ExprVal.Number>;
  displayMode: 'simple' | 'list';
  hasCustomFileEndings?: boolean;
  validFileEndings?: string | string[];
  alertOnDelete?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
  renderAsSummary?: boolean;
  forceShowInSummary?: ExprValToActualOrExpr<ExprVal.Boolean>;
}

export interface FileUploadSummaryOverrides extends ISummaryOverridesCommon {
  showNextButton?: boolean;
}

export type FileUploadSummaryOverridesWithRef =
  | ({ componentId: string } & FileUploadSummaryOverrides)
  | ({ componentType: 'FileUpload' } & FileUploadSummaryOverrides);

export const componentConfig = {
  category: CompCategory.Form,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: true,
    canHaveAttachments: true,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompFileUploadExternal;
  summaryOverrides: FileUploadSummaryOverrides;
  summaryOverridesWithRef: FileUploadSummaryOverridesWithRef;
};

// Source hash: f8087e46be3b83dc9c0fe67242d42ffa41c6d72c72369a58b8748eb9b3179b2b
