import { StudioDetails as Root } from './StudioDetails';
import { StudioDetailsContent } from './StudioDetailsContent';
import { StudioDetailsSummary } from './StudioDetailsSummary';

type StudioDetailsComponent = typeof Root & {
  Content: typeof StudioDetailsContent;
  Summary: typeof StudioDetailsSummary;
};

const StudioDetails = Root as StudioDetailsComponent;

StudioDetails.Content = StudioDetailsContent;
StudioDetails.Summary = StudioDetailsSummary;

export { StudioDetails };
