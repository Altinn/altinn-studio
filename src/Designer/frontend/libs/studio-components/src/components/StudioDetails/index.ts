import { StudioDetails as Root } from './StudioDetails';
import { StudioDetailsContent } from './StudioDetailsContent';
import { StudioDetailsSummary } from './StudioDetailsSummary';

type StudioDetailsComponent = typeof Root & {
  Content: typeof StudioDetailsContent;
  Summary: typeof StudioDetailsSummary;
};

const StudioDetails = Root as StudioDetailsComponent;

StudioDetails.Summary = StudioDetailsSummary;
StudioDetails.Content = StudioDetailsContent;

export { StudioDetails };
