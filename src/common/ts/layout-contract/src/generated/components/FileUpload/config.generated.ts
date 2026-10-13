import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import {
  ComponentBase,
  FormComponentProps,
  IDataModelBindingsList,
  IDataModelBindingsSimple,
  ISelectionComponent,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';

export interface CompFileUploadExternal
  extends
    ComponentBase,
    FormComponentProps,
    SummarizableComponentProps,
    LabeledComponentProps,
    ISelectionComponent {
  type: 'FileUpload';
  textResourceBindings?: { tagTitle?: ExprValToActualOrExpr<ExprVal.String> } & TRBFormComp &
    TRBSummarizable &
    TRBLabel;
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
}

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
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 0409c9cafede63a8fa1dacf30fd7712971f2b58f058dc9cc9a51415eb2dafdc7
