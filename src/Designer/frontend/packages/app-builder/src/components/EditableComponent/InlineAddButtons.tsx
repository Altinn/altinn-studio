import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@designer/components';
import { PlusIcon } from '@designer/icons';
import type { LayoutComponent } from '../../types';
import { getTextKey } from '../../utils/componentUtils';
import { hasOptions, isQuestionType } from '../../utils/newComponentUtils';
import { getInlineOptions, getNextOptionValue, getOptionSource } from '../../utils/optionUtils';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import classes from './EditableComponent.module.css';

export type InlineAddButtonsProps = {
  component: LayoutComponent;
};

/**
 * Adds what the selected component can show but does not yet: a description, or another option.
 * The new text gets a default the user changes in place.
 */
export function InlineAddButtons({ component }: InlineAddButtonsProps): ReactElement | null {
  const { t } = useTranslation();
  const { pageName, updateComponent, saveTexts } = usePageEditing();
  const textKey = (name: string): string => `${pageName}.${component.id}.${name}`;
  const canAddDescription = isQuestionType(component.type) && !getTextKey(component, 'description');
  const canAddOption = hasOptions(component.type) && getOptionSource(component) === 'inline';

  if (!canAddDescription && !canAddOption) return null;

  const addDescription = (): void => {
    const descriptionKey = textKey('description');
    saveTexts({ [descriptionKey]: t('app_builder.default_text.description') });
    updateComponent(component.id, (current) => ({
      ...current,
      textResourceBindings: { ...current.textResourceBindings, description: descriptionKey },
    }));
  };

  const addOption = (): void => {
    const options = getInlineOptions(component);
    const value = getNextOptionValue(options);
    const labelKey = textKey(`option${value}`);
    saveTexts({ [labelKey]: t('app_builder.default_text.option', { number: options.length + 1 }) });
    updateComponent(component.id, (current) => ({
      ...current,
      options: [...getInlineOptions(current), { value, label: labelKey }],
    }));
  };

  return (
    <div className={classes.inlineAddButtons} data-size='sm'>
      {canAddDescription && (
        <StudioButton
          variant='tertiary'
          data-size='sm'
          icon={<PlusIcon />}
          onClick={addDescription}
        >
          {t('app_builder.add_description')}
        </StudioButton>
      )}
      {canAddOption && (
        <StudioButton variant='tertiary' data-size='sm' icon={<PlusIcon />} onClick={addOption}>
          {t('app_builder.add_option')}
        </StudioButton>
      )}
    </div>
  );
}
