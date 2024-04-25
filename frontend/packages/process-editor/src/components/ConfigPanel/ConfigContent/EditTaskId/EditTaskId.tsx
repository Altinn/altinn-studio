import React, { type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { checkForInvalidCharacters } from '../../../../utils/configPanelUtils/configPanelUtils';
import { StudioToggleableTextfield } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { useBpmnContext } from '../../../../contexts/BpmnContext';

import type { MetaDataForm } from '../../../../contexts/BpmnConfigPanelContext';
import { useBpmnConfigPanelFormContext } from '../../../../contexts/BpmnConfigPanelContext';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import classes from './EditTaskId.module.css';
import { useTaskIds } from '../../../../hooks/useTaskIds';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';

type EditTaskIdProps = HTMLAttributes<HTMLDivElement>;
export const EditTaskId = ({ ...rest }: EditTaskIdProps): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef, setBpmnDetails } = useBpmnContext();
  const { layoutSets } = useBpmnApiContext();
  const { metaDataFormRef } = useBpmnConfigPanelFormContext();

  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const otherTaskIds = useTaskIds(layoutSets).filter((id) => id !== bpmnDetails.id);

  const updateId = (value: string): void => {
    modeling.updateProperties(bpmnDetails.element, {
      id: value,
    });
    setBpmnDetails({
      ...bpmnDetails,
      id: value,
    });
  };

  const handleOnTaskIdBlur = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newId = event.target.value;

    if (newId === bpmnDetails.id) return;

    const newMetadata: MetaDataForm = {
      taskIdChanges: [
        {
          newId,
          oldId: bpmnDetails.id,
        },
      ],
    };
    metaDataFormRef.current = Object.assign(
      {},
      metaDataFormRef.current, // Current value of metaDataFormRef
      newMetadata, // New metadata to merge
    );
    updateId(newId);
  };

  const validateTaskId = (newId: string): string => {
    const errorMessages = {
      unique: t('process_editor.validation_error.id_not_unique'),
      required: t('validation_errors.required'),
      maxLength: t('process_editor.validation_error.id_max_length', { 0: 50 }),
      reservedWord: t('process_editor.validation_error.id_reserved', {
        0: 'starte ID-en med Custom',
      }),
      noSpacing: t('process_editor.validation_error.no_spacing'),
      invalidLetter: t('process_editor.validation_error.letters'),
      invalidSymbol: t('process_editor.validation_error.symbols'),
    };

    const validationRules = [
      { name: 'unique', condition: otherTaskIds.includes(newId) },
      { name: 'required', condition: newId.length === 0 },
      { name: 'reservedWord', condition: newId.toLowerCase().startsWith('custom') },
      { name: 'maxLength', condition: newId.length > 50 },
      { name: 'noSpacing', condition: newId.includes(' ') },
      {
        name: checkForInvalidCharacters(newId),
        condition: checkForInvalidCharacters(newId),
      },
    ];

    for (const rule of validationRules) {
      if (rule.condition) {
        return errorMessages[rule.name];
      }
    }

    return '';
  };

  return (
    <div {...rest}>
      <StudioToggleableTextfield
        customValidation={validateTaskId}
        inputProps={{
          className: classes.textfield,
          icon: <KeyVerticalIcon />,
          label: t('process_editor.configuration_panel_change_task_id'),
          value: bpmnDetails.id,
          onBlur: (event) => handleOnTaskIdBlur(event),
          size: 'small',
        }}
        viewProps={{
          className: classes.view,
          children: (
            <span>
              <b>ID:</b> {bpmnDetails.id}
            </span>
          ),
          value: bpmnDetails.id,
          variant: 'tertiary',
          'aria-label': t('process_editor.configuration_panel_change_task_id'),
        }}
      />
    </div>
  );
};
