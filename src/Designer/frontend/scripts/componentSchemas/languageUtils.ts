import nb from '../../language/src/nb.json';
import type { ExpandedComponentSchema } from './types';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export const allTextResourceBindingKeys: string[] = [];

export const pushTextResourceBindingKeys = (schema: ExpandedComponentSchema) => {
  if (schema.properties?.textResourceBindings) {
    const textResourceBindingKeys = Object.keys(schema.properties.textResourceBindings.properties);
    allTextResourceBindingKeys.push(...textResourceBindingKeys);
  }
};

export const sortTextResourceBindings = (textResourceBindings: KeyValuePairs): KeyValuePairs => {
  const { title, description, help, ...rest } = textResourceBindings;
  const sorted: KeyValuePairs = {};
  if (title) {
    sorted.title = title;
  }
  if (description) {
    sorted.description = description;
  }
  if (help) {
    sorted.help = help;
  }
  return { ...sorted, ...rest };
};

/**
 * Logs language keys and values displayed in the "Tekst" accordion in the component configuration column.
 * Use it to find missing entries in the language file.
 * @param textResourceBindingKeys Array of text resource binding keys.
 */
export const logTextResourceLabels = (textResourceBindingKeys: string[]) => {
  textResourceBindingKeys.sort().forEach((key) => {
    console.log(
      `"ux_editor.modal_properties_textResourceBindings_${key}": "${nb['ux_editor.modal_properties_textResourceBindings_' + key] || ''}",`,
    );
    console.log(
      `"ux_editor.modal_properties_textResourceBindings_${key}_add": "${nb['ux_editor.modal_properties_textResourceBindings_' + key + '_add'] || ''}",`,
    );
  });
};

/**
 * Logs all language keys and values in the component configuration column, except for those in the "Tekst" accordion.
 * Use it to find missing entries in the language file.
 * @param componentPropertyKeys Array of component property keys.
 */
export const logComponentPropertyLabels = (componentPropertyKeys: string[]) => {
  componentPropertyKeys.sort().forEach((key) => {
    console.log(
      `"ux_editor.component_properties.${key}": "${nb['ux_editor.component_properties.' + key] || ''}",`,
    );
  });
};
