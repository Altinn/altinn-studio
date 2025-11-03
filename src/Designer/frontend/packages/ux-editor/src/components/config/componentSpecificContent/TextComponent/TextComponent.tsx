import React, { useState } from 'react';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { properties } from '../../../../testing/schemas/json/component/Text.schema.v1.json';
import {
  type Expression,
  StudioCard,
  StudioFormActions,
  StudioManualExpression,
  StudioProperty,
} from '@studio/components';
import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import classes from './TextComponent.module.css';
import { useExpressionTexts } from 'app-shared/hooks/useExpressionTexts';

type TextProperties = keyof typeof properties;
const textSpecificProperty: TextProperties = 'value';

export type TextComponentProps = {
  component: FormItem<ComponentType.Text>;
  handleComponentChange: (component: FormItem<ComponentType.Text>) => void;
  className?: string;
};

export const TextComponent = ({
  component,
  handleComponentChange,
  className,
}: TextComponentProps): JSX.Element => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const [value, setValue] = useState<Expression>(JSON.stringify(component?.value) ?? '');
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
  const [isValid, setIsValid] = useState(false);
  const texts = useExpressionTexts();
  const { t } = useTranslation();
  const isDisabled = !isValid || value === component?.value;

  if (!isEditMode) {
    return (
      <StudioProperty.Button
        property={componentPropertyLabel(textSpecificProperty)}
        value={component?.value}
        onClick={() => setIsEditMode(true)}
      />
    );
  }

  const handleValidChange = (newExpression: Expression) => {
    setValue(newExpression);
  };

  const saveValue = () => {
    handleComponentChange({
      ...component,
      value,
    });
    setIsEditMode(false);
  };

  return (
    <StudioCard className={cn(className, classes.wrapper)}>
      <StudioManualExpression
        expression={component.value}
        onValidExpressionChange={handleValidChange}
        onValidityChange={setIsValid}
        texts={texts}
      />
      <StudioFormActions
        primary={{
          label: t('general.save'),
          onClick: saveValue,
          disabled: isDisabled,
        }}
        secondary={{
          label: t('general.cancel'),
          onClick: () => setIsEditMode(false),
        }}
        isLoading={false}
      />
    </StudioCard>
  );
};
