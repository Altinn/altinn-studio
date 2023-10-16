import React from 'react';
import { useDispatch } from 'react-redux';

import { Checkbox } from '@digdir/design-system-react';

import classes from 'src/features/devtools/components/PermissionsEditor/PermissionsEditor.module.css';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { ProcessActions } from 'src/features/process/processSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';
import type { IGetProcessStateFulfilled, IProcessPermissions } from 'src/features/process';
import type { ProcessTaskType } from 'src/types';

export const PermissionsEditor = () => {
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

  return (
    <Checkbox.Group
      legend='Policy'
      className={classes.checkboxWrapper}
    >
      <Checkbox
        size='small'
        checked={Boolean(write)}
        onChange={(e) => handleChange((obj) => (obj.write = e.target.checked))}
        value='nothing'
      >
        Write
      </Checkbox>
      <Checkbox
        size='small'
        checked={Boolean(actions?.confirm)}
        onChange={(e) => handleChange((obj) => (obj.actions = { ...obj.actions, confirm: e.target.checked }))}
        value='nothing'
      >
        Confirm
      </Checkbox>
      <Checkbox
        size='small'
        checked={Boolean(actions?.sign)}
        onChange={(e) => handleChange((obj) => (obj.actions = { ...obj.actions, sign: e.target.checked }))}
        value='nothing'
      >
        Sign
      </Checkbox>
      <Checkbox
        size='small'
        checked={Boolean(actions?.reject)}
        onChange={(e) => handleChange((obj) => (obj.actions = { ...obj.actions, reject: e.target.checked }))}
        value='nothing'
      >
        Reject
      </Checkbox>
    </Checkbox.Group>
  );
};
