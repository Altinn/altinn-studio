import nb from '../../language/src/nb.json';

// Logs language keys and values related to the "Tekst" accordion in the component configuration.
// Use it to find missing entries in the language file(s).
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

// Logs various language keys and values related to the component configuration.
// Use it to find missing entries in the language file(s).
export const logComponentPropertyLabels = (componentPropertyKeys: string[]) => {
  componentPropertyKeys.sort().forEach((key) => {
    console.log(
      `"ux_editor.component_properties.${key}": "${nb['ux_editor.component_properties.' + key] || ''}",`,
    );
  });
};
