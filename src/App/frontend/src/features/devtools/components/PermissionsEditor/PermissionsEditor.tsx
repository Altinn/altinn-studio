import React from 'react';

import { Checkbox, Fieldset } from '@digdir/designsystemet-react';

import classes from 'src/features/devtools/components/PermissionsEditor/PermissionsEditor.module.css';
import {
  instanceQueries,
  useInstanceDataQueryArgs,
  useSelectFromInstanceData,
} from 'src/features/instance/InstanceContext';
import type { IInstance, ITask } from 'src/types/shared';

export const PermissionsEditor = () => {
  const args = useInstanceDataQueryArgs();
  const instanceSelector = useSelectFromInstanceData();

  const process = instanceSelector((instance) => instance.process);

  if (!process?.currentTask) {
    return;
  }

  const { write, actions } = process.currentTask;

  function handleChange(mutator: (obj: ITask) => ITask) {
    const queryKey = instanceQueries.instanceData(args).queryKey;
    window.queryClient.setQueryData<IInstance>(queryKey, (oldData) => {
      if (!oldData?.process?.currentTask) {
        return oldData;
      }
      const cloned = structuredClone(oldData);
      cloned.process!.currentTask = mutator(cloned.process!.currentTask!);
      return cloned;
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