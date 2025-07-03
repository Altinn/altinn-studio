import React from 'react';

import { Checkbox, Fieldset } from '@digdir/designsystemet-react';

import classes from 'src/features/devtools/components/PermissionsEditor/PermissionsEditor.module.css';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { processQueries, useProcessQuery } from 'src/features/instance/useProcessQuery';
import type { IProcess, ITask } from 'src/types/shared';

export const PermissionsEditor = () => {
  const instanceId = useLaxInstanceId();
  const { write, actions } = useProcessQuery().data?.currentTask || {};

  function handleChange(mutator: (obj: ITask) => ITask) {
    if (instanceId) {
      window.queryClient.setQueryData<IProcess>(processQueries.processStateKey(instanceId), (_queryData) => {
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
    <Fieldset className={classes.checkboxWrapper}>
      <Fieldset.Legend>Policy</Fieldset.Legend>
      <Checkbox
        data-size='sm'
        checked={Boolean(write)}
        onChange={(e) =>
          handleChange((obj) => {
            obj.write = e.target.checked;
            return obj;
          })
        }
        value='nothing'
        label='Write'
      />
      <Checkbox
        data-size='sm'
        checked={Boolean(actions?.confirm)}
        onChange={(e) =>
          handleChange((obj) => {
            obj.actions = { ...obj.actions, confirm: e.target.checked };
            return obj;
          })
        }
        value='nothing'
        label='Confirm'
      />
      <Checkbox
        data-size='sm'
        checked={Boolean(actions?.sign)}
        onChange={(e) =>
          handleChange((obj) => {
            obj.actions = { ...obj.actions, sign: e.target.checked };
            return obj;
          })
        }
        value='nothing'
        label='Sign'
      />
      <Checkbox
        data-size='sm'
        checked={Boolean(actions?.reject)}
        onChange={(e) =>
          handleChange((obj) => {
            obj.actions = { ...obj.actions, reject: e.target.checked };
            return obj;
          })
        }
        value='nothing'
        label='Reject'
      />
    </Fieldset>
  );
};
