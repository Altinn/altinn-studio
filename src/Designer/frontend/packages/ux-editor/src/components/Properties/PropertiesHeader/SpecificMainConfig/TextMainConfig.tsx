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
import classes from './TextMainConfig.module.css';
import { useExpressionTexts } from 'app-shared/hooks/useExpressionTexts';

type TextMainProperties = keyof typeof properties;
const textMainProperty: TextMainProperties = 'value';

export type TextMainConfigProps = {
  component: FormItem<ComponentType.Text>;
  handleComponentChange: (component: FormItem<ComponentType.Text>) => void;
  className?: string;
};
export const TextMainConfig = ({
  component,
  handleComponentChange,
  className,
}: TextMainConfigProps): JSX.Element => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const [value, setValue] = useState<Expression>(JSON.stringify(component?.value) ?? '');
  const [isActive, setIsActive] = React.useState<boolean>(false);
  const [isValid, setIsValid] = useState(false);

  const texts = useExpressionTexts();
  const { t } = useTranslation();

  if (!isActive) {
    return (
      <StudioProperty.Button
        property={componentPropertyLabel(textMainProperty)}
        value={component?.value}
        onClick={() => setIsActive(true)}
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
    setIsActive(false);
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
          disabled: !isValid,
        }}
        secondary={{
          label: t('general.cancel'),
          onClick: () => setIsActive(false),
        }}
        isLoading={false}
      />
    </StudioCard>
  );
};
