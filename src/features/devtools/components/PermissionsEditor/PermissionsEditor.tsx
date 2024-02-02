import React from 'react';

import { Checkbox } from '@digdir/design-system-react';

import classes from 'src/features/devtools/components/PermissionsEditor/PermissionsEditor.module.css';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import type { IProcess, ITask } from 'src/types/shared';

export const PermissionsEditor = () => {
  const instanceId = useLaxInstanceData()?.id;
  const { write, actions } = useLaxProcessData()?.currentTask || {};

  function handleChange(mutator: (obj: ITask) => ITask) {
    if (instanceId) {
      window.queryClient.setQueryData<IProcess>(['fetchProcessState', instanceId], (_queryData) => {
        const queryData = structuredClone(_queryData);
        if (!queryData?.currentTask) {
          return _queryData;
        }
        queryData.currentTask = mutator(queryData.currentTask);
        return queryData;
      });
    }
  }

  return (
    <Checkbox.Group
      legend='Policy'
      className={classes.checkboxWrapper}
    >
      <Checkbox
        size='small'
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
