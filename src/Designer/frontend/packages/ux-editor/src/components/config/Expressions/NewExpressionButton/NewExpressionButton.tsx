import { PlusIcon } from '@studio/icons';
import { useText } from '../../../../hooks';
import { StudioDropdown } from '@studio/components';
import { useFormItemContext } from '../../../../containers/FormItemContext';
import { addExpressionToFormItem, getUndefinedExpressionProperties } from '../utils';
import type { FormItemProperty } from '../../../../types/FormItemProperty';
import { useComponentPropertyLabel } from '../../../../hooks/useComponentPropertyLabel';

export const NewExpressionButton = () => {
  const t = useText();
  const { formItem } = useFormItemContext();

  const remainingProperties = getUndefinedExpressionProperties(formItem);
  const areThereRemainingProperties = remainingProperties.length > 0;

  const title = areThereRemainingProperties
    ? t('right_menu.expressions_add')
    : t('right_menu.expressions_expressions_limit_reached_alert');

  return (
    <StudioDropdown
      icon={<PlusIcon />}
      triggerButtonText={title}
      triggerButtonVariant='secondary'
      triggerButtonDisabled={!areThereRemainingProperties}
    >
      <StudioDropdown.List>
        {remainingProperties.map((property) => (
          <MenuItem property={property} key={property.path.join('.')} />
        ))}
      </StudioDropdown.List>
    </StudioDropdown>
  );
};

const MenuItem = ({ property }: { property: FormItemProperty }) => {
  const { formItem, handleUpdate, debounceSave } = useFormItemContext();
  const text = useAddExpressionText(property);

  const handleAddExpression = async () => {
    const newFormItem = addExpressionToFormItem(formItem, property);
    handleUpdate(newFormItem);
    await debounceSave(); // Todo: handleSave does not work here. Will probably be fixed by https://github.com/Altinn/altinn-studio/issues/12383.
  };

  return (
    <StudioDropdown.Item>
      <StudioDropdown.Button onClick={handleAddExpression}>{text}</StudioDropdown.Button>
    </StudioDropdown.Item>
  );
};

const useAddExpressionText = (property: FormItemProperty) => {
  const propertyLabel = useComponentPropertyLabel();
  return propertyLabel(property.path.at(-1), property.definition);
};
