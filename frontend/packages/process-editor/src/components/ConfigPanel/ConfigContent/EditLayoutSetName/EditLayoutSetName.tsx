import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioToggleableTextfield } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '@altinn/process-editor/contexts/BpmnApiContext';
import { getLayoutSetIdValidationErrorKey } from 'app-shared/utils/layoutSetsUtils';
import { Paragraph } from '@digdir/designsystemet-react';

interface EditLayoutSetNameProps {
  existingLayoutSetName: string;
}
export const EditLayoutSetName = ({
  existingLayoutSetName,
}: EditLayoutSetNameProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, mutateLayoutSetId } = useBpmnApiContext();
  const { bpmnDetails } = useBpmnContext();

  const handleOnLayoutSetNameBlur = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newName = event.target.value;
    if (newName === existingLayoutSetName) return;
    mutateLayoutSetId({ layoutSetIdToUpdate: existingLayoutSetName, newLayoutSetId: newName });
  };

  const handleValidation = (newLayoutSetId: string): string => {
    const validationResult = getLayoutSetIdValidationErrorKey(
      layoutSets,
      bpmnDetails.element.id,
      newLayoutSetId,
    );
    return validationResult ? t(validationResult) : undefined;
  };

  return (
    <StudioToggleableTextfield
      customValidation={handleValidation}
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
