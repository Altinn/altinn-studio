import React from 'react';
import { useDispatch } from 'react-redux';

import { Checkbox, FieldSet } from '@digdir/design-system-react';

import classes from 'src/features/devtools/components/PermissionsEditor/PermissionsEditor.module.css';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { ProcessActions } from 'src/features/process/processSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';
import type { IGetProcessStateFulfilled, IProcessPermissions } from 'src/features/process';
import type { ProcessTaskType } from 'src/types';

export const PermissionsEditor = () => {
  const shouldShow = useAppSelector((state) => state.applicationMetadata.applicationMetadata?.features?.processActions);
  const { read, write, actions, taskType, taskId } = useAppSelector((state) => state.process);
  const dispatch = useDispatch();

  function handleChange(mutator: (obj: IProcessPermissions) => void) {
    const processState: IGetProcessStateFulfilled = {
      taskId,
      taskType: taskType as ProcessTaskType,
      read,
      write,
      actions: actions ?? {},
    };

    mutator(processState);

    dispatch(ProcessActions.getFulfilled(processState));
    dispatch(FormLayoutActions.updateLayouts({}));
  }

  if (!shouldShow) {
    return null;
  }

  return (
    <FieldSet
      legend='Policy'
      contentClassName={classes.checkboxWrapper}
    >
      <Checkbox
        checked={Boolean(write)}
        label='Write'
        onChange={(e) => handleChange((obj) => (obj.write = e.target.checked))}
      />
      <Checkbox
        checked={Boolean(actions?.confirm)}
        label='Confirm'
        onChange={(e) => handleChange((obj) => (obj.actions = { ...obj.actions, confirm: e.target.checked }))}
      />
      <Checkbox
        checked={Boolean(actions?.sign)}
        label='Sign'
        onChange={(e) => handleChange((obj) => (obj.actions = { ...obj.actions, sign: e.target.checked }))}
      />
      <Checkbox
        checked={Boolean(actions?.reject)}
        label='Reject'
        onChange={(e) => handleChange((obj) => (obj.actions = { ...obj.actions, reject: e.target.checked }))}
      />
    </FieldSet>
  );
};
