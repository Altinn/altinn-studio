import type { ILayoutCompBase } from 'src/layout/layout';

export interface SummaryDisplayProperties {
  hideChangeButton?: boolean;
  hideValidationMessages?: boolean;
  useComponentGrid?: boolean;
  hideBottomBorder?: boolean;
}

export interface ILayoutCompSummary extends ILayoutCompBase<'Summary'> {
  componentRef?: string;
  pageRef?: string;
  display?: SummaryDisplayProperties;
  largeGroup?: boolean;
  excludedChildren?: string[];
}
