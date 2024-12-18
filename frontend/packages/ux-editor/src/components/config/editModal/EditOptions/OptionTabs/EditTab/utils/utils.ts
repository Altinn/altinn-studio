import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import type { Option } from 'app-shared/types/Option';

type handleOptionsChangeProps = { options: Option[] } & Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function handleOptionsChange({
  options,
  component,
  handleComponentChange,
}: handleOptionsChangeProps) {
  if (component.optionsId) {
    delete component.optionsId;
  }

  handleComponentChange({
    ...component,
    options,
  });
}

type handleOptionsIdChangeProps = { optionsId: string } & Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function handleOptionsIdChange({
  optionsId,
  component,
  handleComponentChange,
}: handleOptionsIdChangeProps): void {
  if (component.options) {
    delete component.options;
  }

  handleComponentChange({
    ...component,
    optionsId,
  });
}
