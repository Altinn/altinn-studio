import nb from '../../language/src/nb.json';

export const generateTextResourceLabels = (textResourceBindingKeys: string[]) => {
  textResourceBindingKeys.sort().forEach((key) => {
    console.log(
      `"ux_editor.modal_properties_textResourceBindings_${key}": "${nb['ux_editor.modal_properties_textResourceBindings_' + key] || ''}",`,
    );
    console.log(
      `"ux_editor.modal_properties_textResourceBindings_${key}_add": "${nb['ux_editor.modal_properties_textResourceBindings_' + key + '_add'] || ''}",`,
    );
  });
};

export const generateComponentPropertyLabels = (componentPropertyKeys: string[]) => {
  componentPropertyKeys.sort().forEach((key) => {
    console.log(
      `"ux_editor.component_properties.${key}": "${nb['ux_editor.component_properties.' + key] || ''}",`,
    );
  });
};
