import React from 'react';

import { Checkbox, Fieldset } from '@digdir/designsystemet-react';

import { useCurrentInstance, useOptimisticallyUpdateInstance } from 'src/core/queries/instance';
import classes from 'src/features/devtools/components/PermissionsEditor/PermissionsEditor.module.css';
import type { ITask } from 'src/types/shared';

export const PermissionsEditor = () => {
  const instance = useCurrentInstance();
  const updateInstance = useOptimisticallyUpdateInstance();
  const { write, actions } = instance?.process?.currentTask || {};

  function handleChange(mutator: (obj: ITask) => ITask) {
    updateInstance((oldData) => {
      const process = structuredClone(oldData.process);
      if (!process?.currentTask) {
        return oldData;
      }
      process.currentTask = mutator(process.currentTask);
      return { ...oldData, process };
    });
  }

  return (
    <Fieldset>
      <Fieldset.Legend>Policy</Fieldset.Legend>
      <div className={classes.checkboxesWrapper}>
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
      </div>
    </Fieldset>
  );
};
