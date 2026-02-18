import React from 'react';
import { useNavigate } from 'react-router-dom';

import classes from 'nextsrc/features/Instantiation/components/createInstanceButton/createInstanceButton.module.css';
import { useCreateInstance } from 'nextsrc/features/Instantiation/instantiation.queries';
import { extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId } from 'nextsrc/features/Instantiation/utils';
import { routeBuilders } from 'nextsrc/routesBuilder';

import { Button } from 'src/app-components/Button/Button';

export function CreateInstanceButton({ texts }: { texts: { newInstance: string } }) {
  const createInstanceMutation = useCreateInstance();
  const navigate = useNavigate();

  return (
    <div className={classes.startNewButtonContainer}>
      {createInstanceMutation.error && <p>{createInstanceMutation.error.message}</p>}
      <Button
        onClick={async () => {
          const result = await createInstanceMutation.mutateAsync();

          const { instanceGuid, instanceOwnerPartyId } = extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId(
            result.id,
          );

          return navigate(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
        }}
        disabled={createInstanceMutation.isPending}
        size='md'
      >
        {createInstanceMutation.isPending ? 'Oppretter...' : texts.newInstance}
      </Button>
    </div>
  );
}
