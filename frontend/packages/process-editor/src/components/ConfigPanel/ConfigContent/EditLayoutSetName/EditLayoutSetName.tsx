import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioToggleableTextfield } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { Paragraph } from '@digdir/designsystemet-react';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';

interface EditLayoutSetNameProps {
  existingLayoutSetName: string;
}
export const EditLayoutSetName = ({
  existingLayoutSetName,
}: EditLayoutSetNameProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, mutateLayoutSetId } = useBpmnApiContext();
  const { validateLayoutSetName } = useValidateLayoutSetName();

  const handleOnLayoutSetNameBlur = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newName = event.target.value;
    if (newName === existingLayoutSetName) return;
    mutateLayoutSetId({ layoutSetIdToUpdate: existingLayoutSetName, newLayoutSetId: newName });
  };

  return (
    <StudioToggleableTextfield
      customValidation={(newLayoutSetName: string) =>
        validateLayoutSetName(newLayoutSetName, layoutSets)
      }
      inputProps={{
        icon: <KeyVerticalIcon />,
        label: t('process_editor.configuration_panel_layout_set_name_label'),
        value: existingLayoutSetName,
        onBlur: (event) => handleOnLayoutSetNameBlur(event),
        size: 'small',
      }}
      viewProps={{
        children: (
          <Paragraph size='small'>
            <strong>{t('process_editor.configuration_panel_layout_set_name')}</strong>
            {existingLayoutSetName}
          </Paragraph>
        ),
        variant: 'tertiary',
        'aria-label': t('process_editor.configuration_panel_layout_set_name_label'),
      }}
    />
  );
};
