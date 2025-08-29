import { StudioErrorSummary as Root } from './StudioErrorSummary';
import type { StudioErrorSummaryProps } from './StudioErrorSummary';
import { StudioErrorSummaryHeading } from './StudioErrorSummaryHeading';
import { StudioErrorSummaryList } from './StudioErrorSummaryList';
import { StudioErrorSummaryItem } from './StudioErrorSummaryItem';
import { StudioErrorSummaryLink } from './StudioErrorSummaryLink';

type StudioErrorSummaryComponent = typeof Root & {
  Heading: typeof StudioErrorSummaryHeading;
  List: typeof StudioErrorSummaryList;
  Item: typeof StudioErrorSummaryItem;
  Link: typeof StudioErrorSummaryLink;
};

const StudioErrorSummary = Root as StudioErrorSummaryComponent;

StudioErrorSummary.Heading = StudioErrorSummaryHeading;
StudioErrorSummary.List = StudioErrorSummaryList;
StudioErrorSummary.Item = StudioErrorSummaryItem;
StudioErrorSummary.Link = StudioErrorSummaryLink;

export type { StudioErrorSummaryProps };
export { StudioErrorSummary };
