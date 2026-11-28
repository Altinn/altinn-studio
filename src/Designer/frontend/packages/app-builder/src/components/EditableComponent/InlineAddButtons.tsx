import { useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ComponentType } from 'app-shared/types/ComponentType';
import { StudioButton } from '@designer/components';
import { PlusIcon } from '@designer/icons';
import { TEXT_KEY_ATTRIBUTE } from '../../constants';
import type { LayoutComponent } from '../../types';
import { getTextKey } from '../../utils/componentUtils';
import { hasOptions, isQuestionType } from '../../utils/newComponentUtils';
import { getInlineOptions, getNextOptionValue, getOptionSource } from '../../utils/optionUtils';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import { useCanvasState } from '../CanvasState/CanvasStateContext';
import { isLikertStatic } from '../../utils/likertUtils';
import classes from './EditableComponent.module.css';

export type InlineAddButtonsProps = {
  component: LayoutComponent;
};

/**
 * Adds what the selected component can show but does not yet: a description, or another option.
 * The new text gets a default and focus, so the user types over it where it is.
 */
export function InlineAddButtons({ component }: InlineAddButtonsProps): ReactElement | null {
  const { t } = useTranslation();
  const { pageName, updateComponent, saveTexts } = usePageEditing();
  const { setOpenSettings } = useCanvasState();
  const ref = useRef<HTMLDivElement>(null);
  const [addedTextKey, setAddedTextKey] = useState<string>();
  useFocusAddedText(ref, addedTextKey, () => setAddedTextKey(undefined));
  const textKey = (name: string): string => `${pageName}.${component.id}.${name}`;
  const canAddDescription = isQuestionType(component.type) && !getTextKey(component, 'description');
  // A dropdown's options are not shown on the canvas, so they are only added in the settings.
  const canAddOption =
    hasOptions(component.type) &&
    component.type !== ComponentType.Dropdown &&
    getOptionSource(component) === 'inline';

  // A question in a Likert table asks for its text first, in the settings, since the text names its field.
  if (isLikertStatic(component)) {
    return (
      <div ref={ref} className={classes.inlineAddButtons} data-size='sm'>
        <StudioButton
          variant='tertiary'
          data-size='sm'
          icon={<PlusIcon />}
          onClick={() => setOpenSettings('component')}
        >
          {t('app_builder.likert.add_question')}
        </StudioButton>
      </div>
    );
  }

  if (!canAddDescription && !canAddOption && !addedTextKey) return null;

  const addDescription = (): void => {
    const descriptionKey = textKey('description');
    saveTexts({ [descriptionKey]: t('app_builder.default_text.description') });
    updateComponent(component.id, (current) => ({
      ...current,
      textResourceBindings: { ...current.textResourceBindings, description: descriptionKey },
    }));
    setAddedTextKey(descriptionKey);
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
    setAddedTextKey(labelKey);
  };

  return (
    <div ref={ref} className={classes.inlineAddButtons} data-size='sm'>
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

/** Focuses the added text in the component once it is shown, and selects it to be typed over. */
function useFocusAddedText(
  ref: RefObject<HTMLDivElement>,
  textKey: string | undefined,
  onFocused: () => void,
): void {
  useEffect(() => {
    if (!textKey) return;
    const component = ref.current?.closest('[data-component-id]');
    const text = component?.querySelector<HTMLElement>(`[${TEXT_KEY_ATTRIBUTE}="${textKey}"]`);
    if (!text) return;
    text.focus();
    text.ownerDocument.getSelection()?.selectAllChildren(text);
    onFocused();
  });
}
