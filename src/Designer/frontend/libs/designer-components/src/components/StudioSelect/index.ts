import { StudioSelect as Root } from './StudioSelect';
import { StudioSelectOption } from './StudioSelectOption';
import { SelectOptgroup } from '@digdir/designsystemet-react';

type StudioSelectComponent = typeof Root & {
  Option: typeof StudioSelectOption;
  OptGroup: typeof SelectOptgroup;
};

const StudioSelect = Root as StudioSelectComponent;

StudioSelect.Option = StudioSelectOption;
StudioSelect.OptGroup = SelectOptgroup;

StudioSelect.Option.displayName = 'StudioSelect.Option';
StudioSelect.OptGroup.displayName = 'StudioSelect.OptGroup';

export type { StudioSelectProps } from './StudioSelect';
export type { StudioSelectOptionProps } from './StudioSelectOption';

export { StudioSelect };
