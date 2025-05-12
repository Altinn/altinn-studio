import { StudioFieldset as Root } from './StudioFieldset';
import { StudioFieldsetLegend } from './StudioFieldsetLegend';
import { StudioFieldsetDescription } from './StudioFieldsetDescription';

type StudioFieldsetComponent = typeof Root & {
  Legend: typeof StudioFieldsetLegend;
  Description: typeof StudioFieldsetDescription;
};

const StudioFieldset = Root as StudioFieldsetComponent;

StudioFieldset.Legend = StudioFieldsetLegend;
StudioFieldset.Description = StudioFieldsetDescription;

export type { StudioFieldsetProps } from './StudioFieldset';
export { StudioFieldset };
