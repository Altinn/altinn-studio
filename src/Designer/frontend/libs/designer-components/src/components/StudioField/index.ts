import { StudioField as Root } from './StudioField';
import { Description } from './Description';

type StudioFieldComponent = typeof Root & {
  Description: typeof Description;
};

const StudioField: StudioFieldComponent = Root as StudioFieldComponent;
StudioField.Description = Description;
export { StudioField };
