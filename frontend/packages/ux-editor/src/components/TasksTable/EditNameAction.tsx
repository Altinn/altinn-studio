import React, { useRef, useState } from 'react';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { createNewTextResourceId } from '../Settings/SettingsUtils';
import { StudioButton, StudioDialog } from '@studio/components';
import { useTextResourceValue } from '../TextResource/hooks/useTextResourceValue';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { TextResourceEditor } from '../TextResource/TextResourceEditor';
import { CheckmarkIcon, PencilIcon, XMarkIcon } from '@studio/icons';
import classes from './EditNameAction.module.css';

type EditNameModalProps = {
  nameId?: string;
  tasks: TaskNavigationGroup[];
  index: number;
  handleUpdateTaskNavigationGroup: (updatedNavigationTasks: TaskNavigationGroup[]) => void;
};

export const EditNameAction = ({
  nameId,
  tasks,
  index,
  handleUpdateTaskNavigationGroup,
}: EditNameModalProps) => {
  const liveTextResourceValue = useTextResourceValue(nameId);
  const originTextResourceValueRef = useRef<string | undefined>();
  if (originTextResourceValueRef.current === undefined && liveTextResourceValue !== undefined) {
    originTextResourceValueRef.current = liveTextResourceValue;
  }

  const [textResourceId, setTextResourceId] = useState<string | undefined>(
    nameId ?? createNewTextResourceId(tasks, index),
  );
  useTextResourceValue(nameId);
  const [currentValue, setCurrentValue] = useState(liveTextResourceValue);
  const { org, app } = useStudioEnvironmentParams();
  const { mutate } = useUpsertTextResourceMutation(org, app);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleTextResourceChange = () => {
    const updatedNavigationTasks = [...tasks];
    updatedNavigationTasks[index] = {
      ...updatedNavigationTasks[index],
      name: textResourceId,
    };
    handleUpdateTaskNavigationGroup(updatedNavigationTasks);
    dialogRef.current?.close();
  };

  const handleCancel = () => {
    if (currentValue === originTextResourceValueRef.current) {
      dialogRef.current?.close();
    } else {
      mutate({
        textId: textResourceId,
        language: 'nb',
        translation: originTextResourceValueRef.current,
      });
    }
    dialogRef.current?.close();
  };

  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger
        icon={<PencilIcon />}
        variant='tertiary'
        className={classes.openDialogButton}
      >
        Endre visningsnavn
      </StudioDialog.Trigger>
      <StudioDialog ref={dialogRef} closeButton={false}>
        <TextResourceEditor
          textResourceId={textResourceId}
          onReferenceChange={setTextResourceId}
          onSetCurrentValue={setCurrentValue}
        />
        <StudioButton variant='primary' onClick={handleTextResourceChange} icon={<CheckmarkIcon />}>
          Lagre
        </StudioButton>
        <StudioButton
          variant='secondary'
          onClick={handleCancel}
          icon={<XMarkIcon />}
          className={classes.cancelButton}
        >
          Avbryt
        </StudioButton>
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
};
