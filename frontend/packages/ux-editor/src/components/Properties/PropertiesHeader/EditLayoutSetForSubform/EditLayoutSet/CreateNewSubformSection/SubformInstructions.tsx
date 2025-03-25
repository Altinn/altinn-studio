import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioList } from '@studio/components-legacy';

export const SubformInstructions = (): React.ReactElement => {
  const { t } = useTranslation();
  const instructions = [
    t('ux_editor.component_properties.subform.no_existing_layout_set_instruction_name'),
    t('ux_editor.component_properties.subform.no_existing_layout_set_instruction_datamodel'),
    t('ux_editor.component_properties.subform.no_existing_layout_set_instruction_design'),
    t('ux_editor.component_properties.subform.no_existing_layout_set_instruction_table_setup'),
  ];

  return (
    <StudioList.Root size='sm'>
      <StudioList.Heading>
        {t('ux_editor.component_properties.subform.no_existing_layout_set_instructions_header')}
      </StudioList.Heading>
      <StudioList.Ordered>
        {instructions.map((instruction, index) => (
          <StudioList.Item key={index}>{instruction}</StudioList.Item>
        ))}
      </StudioList.Ordered>
    </StudioList.Root>
  );
};
