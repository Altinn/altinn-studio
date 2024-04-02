import React, { type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

import { StudioToggleableTextfield } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { useBpmnContext } from '../../../../contexts/BpmnContext';

import { useBpmnConfigPanelFormContext } from '../../../../contexts/BpmnConfigPanelContext';
import { useBpmnModeler } from '../../../../hooks/useBpmnModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import classes from './EditTaskId.module.css';

type EditTaskIdProps = HTMLAttributes<HTMLDivElement>;
export const EditTaskId = ({ ...rest }: EditTaskIdProps): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef, setBpmnDetails } = useBpmnContext();
  const { setMetaDataForm } = useBpmnConfigPanelFormContext();
  const { getModeler } = useBpmnModeler();

  const modeler = getModeler(modelerRef.current as unknown as HTMLDivElement);
  const modeling: Modeling = modeler.get('modeling');

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

    setMetaDataForm((prevMetaData) => ({
      ...prevMetaData,
      taskIdChanges: [
        {
          newId,
          oldId: bpmnDetails.id,
        },
      ],
    }));
    updateId(newId);
  };

  const validateTaskId = (newId: string): string => {
    if (newId?.length === 0) {
      return t('validation_errors.required');
    }
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
