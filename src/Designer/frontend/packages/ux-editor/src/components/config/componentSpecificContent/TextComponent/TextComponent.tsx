import React, { useState } from 'react';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { properties } from '../../../../testing/schemas/json/component/Text.schema.v1.json';
import { type StringExpression, StudioManualExpression, StudioProperty } from '@studio/components';
import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import { useTranslation } from 'react-i18next';
import { useExpressionTexts } from 'app-shared/hooks/useExpressionTexts';
import { getDisplayValues } from './TextComponentUtils';
import { StudioConfigCard } from '@studio/components';

type TextProperties = keyof typeof properties;
const textSpecificProperty: TextProperties = 'value';

export type TextComponentProps = {
  component: FormItem<ComponentType.Text>;
  handleComponentChange: (component: FormItem<ComponentType.Text>) => void;
};

export const TextComponent = ({
  component,
  handleComponentChange,
}: TextComponentProps): JSX.Element => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const [value, setValue] = useState<StringExpression>(component?.value || null);
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
  const [isValid, setIsValid] = useState(false);
  const texts = useExpressionTexts();
  const { t } = useTranslation();
  const isSaveDisabled = !isValid || value === component?.value;

  if (!isEditMode) {
    return (
      <StudioProperty.Button
        property={componentPropertyLabel(textSpecificProperty)}
        value={getDisplayValues(component?.value)}
        onClick={() => setIsEditMode(true)}
      />
    );
  }

  const handleValidChange = (newExpression: StringExpression) => {
    setValue(newExpression);
  };

  const saveValue = () => {
    handleComponentChange({
      ...component,
      value,
    });
    setIsEditMode(false);
  };

  const handleDelete = () => {
    handleComponentChange({
      ...component,
      value: '',
    });
    setIsEditMode(false);
  };

  return (
    <StudioConfigCard>
      <StudioConfigCard.Header
        cardLabel={componentPropertyLabel(textSpecificProperty)}
        deleteAriaLabel={t('general.delete')}
        onDelete={handleDelete}
        confirmDeleteMessage={t('ux_editor.properties_text.value_confirm_delete')}
        isDeleteDisabled={!component?.value}
      />
      <StudioConfigCard.Body>
        <StudioManualExpression
          expression={component.value}
          onValidExpressionChange={handleValidChange}
          onValidityChange={setIsValid}
          texts={texts}
        />
      </StudioConfigCard.Body>
      <StudioConfigCard.Footer
        saveLabel={t('general.save')}
        cancelLabel={t('general.cancel')}
        onCancel={() => setIsEditMode(false)}
        onSave={saveValue}
        isLoading={false}
        isDisabled={isSaveDisabled}
      />
    </StudioConfigCard>
  );
};
