import React, { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { Button } from 'src/app-components/Button/Button';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { Lang } from 'src/features/language/Lang';
import { signingQueries } from 'src/layout/SigneeList/api';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export function SubmitSigningButton({ baseComponentId }: { baseComponentId: string }) {
  const { mutate: processNext, isPending: isSubmitting, isSuccess } = useProcessNext();

  const { textResourceBindings } = useItemWhenType(baseComponentId, 'SigningActions');
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: signingQueries.all });
  }, [isSuccess, queryClient]);

  const submitButtonText = textResourceBindings?.submitButton ?? 'signing.submit_button';

  return (
    <Button
      onClick={() => processNext()}
      size='md'
      color='success'
      disabled={isSuccess}
      isLoading={isSubmitting}
    >
      <Lang id={submitButtonText} />
    </Button>
  );
}
