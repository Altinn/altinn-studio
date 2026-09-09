import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  extends
    ComponentBase,
    FormComponentPropsWithRequired,
    SummarizableComponentProps,
    LabeledComponentProps {
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

// Source hash: f79b47988a4b2b5e966d362d837384a13112f4750b21ff7f8092b0b1a158672d
