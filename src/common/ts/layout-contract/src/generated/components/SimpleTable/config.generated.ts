import {
  ComponentBase,
  FormComponentProps,
  IDataModelReference,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface Columns {
  header: string;
  accessors: string[];
  component?:
    | { type: 'link'; hrefPath: string; textPath: string; openInNewTab?: boolean }
    | { type: 'date'; format?: string }
    | { type: 'radio'; options?: { label: string; value: string }[] };
}

export interface CompSimpleTableExternal
  extends ComponentBase, FormComponentProps, SummarizableComponentProps, LabeledComponentProps {
  type: 'SimpleTable';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  title: string;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings?: IDataModelBindingsForTable;
  columns: Columns[];
  zebra?: boolean;
  enableDelete?: boolean;
  enableEdit?: boolean;
  size?: 'sm' | 'md' | 'lg';
  externalApi?: DataConfig;
}

export interface DataConfig {
  id: string;
  path: string;
}

export interface IDataModelBindingsForTable {
  tableData: IDataModelReference;
}

export const componentConfig = {
  category: CompCategory.Form,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompSimpleTableExternal;
  summaryOverrides: undefined;
  summaryOverridesWithRef: undefined;
};

// Source hash: 4f84991e530f2dff734ff671f682d4709ae44178ec199fd83b97cd629d5cf946
