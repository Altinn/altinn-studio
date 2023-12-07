import React from 'react';
import { useDispatch } from 'react-redux';

import { Checkbox } from '@digdir/design-system-react';

import classes from 'src/features/devtools/components/PermissionsEditor/PermissionsEditor.module.css';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { useLaxProcessData, useSetProcessData } from 'src/features/instance/ProcessContext';
import type { IProcess, ITask } from 'src/types/shared';

export const PermissionsEditor = () => {
  // TODO: Fix this editor, as the process data is in a context _inside_ the DevTools context, so we cannot reach it

  const { write, actions } = useLaxProcessData()?.currentTask || {};
  const dispatch = useDispatch();
  const setProcessData = useSetProcessData();
  const processData = useLaxProcessData();

  function handleChange(mutator: (obj: ITask) => ITask) {
    if (!processData) {
      return;
    }
    const newProcessData: IProcess = { ...processData };
    if (processData?.currentTask) {
      newProcessData.currentTask = {
        ...processData?.currentTask,
        ...mutator(processData?.currentTask),
      };
    }
    setProcessData?.(newProcessData);
    dispatch(FormLayoutActions.updateLayouts({}));
  }

  return (
    <Checkbox.Group
      legend='Policy'
      className={classes.checkboxWrapper}
    >
      <Checkbox
        size='small'
        disabled={!setProcessData}
        checked={Boolean(write)}
        onChange={(e) =>
          handleChange((obj) => {
            obj.write = e.target.checked;
            return obj;
          })
        }
        value='nothing'
      >
        Write
      </Checkbox>
      <Checkbox
        size='small'
        disabled={!setProcessData}
        checked={Boolean(actions?.confirm)}
        onChange={(e) =>
          handleChange((obj) => {
            obj.actions = { ...obj.actions, confirm: e.target.checked };
            return obj;
          })
        }
        value='nothing'
      >
        Confirm
      </Checkbox>
      <Checkbox
        size='small'
        disabled={!setProcessData}
        checked={Boolean(actions?.sign)}
        onChange={(e) =>
          handleChange((obj) => {
            obj.actions = { ...obj.actions, sign: e.target.checked };
            return obj;
          })
        }
        value='nothing'
      >
        Sign
      </Checkbox>
      <Checkbox
        size='small'
        disabled={!setProcessData}
        checked={Boolean(actions?.reject)}
        onChange={(e) =>
          handleChange((obj) => {
            obj.actions = { ...obj.actions, reject: e.target.checked };
            return obj;
          })
        }
        value='nothing'
      >
        Reject
      </Checkbox>
    </Checkbox.Group>
  );
};
