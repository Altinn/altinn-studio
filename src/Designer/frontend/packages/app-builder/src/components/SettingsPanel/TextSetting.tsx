import type { ReactElement } from 'react';
import { StudioTextarea, StudioTextfield } from '@designer/components';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import type { LayoutComponent } from '../../types';
import { getTextKey } from '../../utils/componentUtils';
import { usePageEditing } from '../PageEditing/PageEditingContext';

export type TextSettingProps = {
  component: LayoutComponent;
  /** The text property, such as `title` or `description`. */
  property: string;
  label: string;
  description?: string;
  isMultiline?: boolean;
};

/**
 * Edits one of the component's texts in the edited language. A text the component does not have yet
 * gets a key the way ux-editor names them, and is saved when the user leaves the field.
 */
export function TextSetting({
  component,
  property,
  label,
  description,
  isMultiline,
}: TextSettingProps): ReactElement {
  const { texts } = useAppBuilder();
  const { pageName, updateComponent, saveTexts } = usePageEditing();
  const textKey = getTextKey(component, property);
  const value = textKey ? (texts[textKey] ?? '') : '';

  const handleSave = (newValue: string): void => {
    if (newValue === value) return;
    if (textKey) {
      saveTexts({ [textKey]: newValue });
      return;
    }
    const newKey = `${pageName}.${component.id}.${property}`;
    saveTexts({ [newKey]: newValue });
    updateComponent(component.id, (current) => ({
      ...current,
      textResourceBindings: { ...current.textResourceBindings, [property]: newKey },
    }));
  };

  // A new key remounts the field when the text changes elsewhere, such as on the canvas.
  const fieldKey = `${textKey}-${value}`;
  const fieldProps = {
    label,
    description,
    defaultValue: value,
    onBlur: (event: { target: { value: string } }) => handleSave(event.target.value.trim()),
  };
  return isMultiline ? (
    <StudioTextarea key={fieldKey} {...fieldProps} rows={3} />
  ) : (
    <StudioTextfield key={fieldKey} {...fieldProps} />
  );
}
