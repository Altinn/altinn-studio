import React, { useEffect } from 'react';

import { Button } from '@app/form-component';
import { useQueryClient } from '@tanstack/react-query';

import { useProcessNext } from 'src/features/instance/useProcessNext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { signingQueries } from 'src/layout/SigneeList/api';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export function SubmitSigningButton({ baseComponentId }: { baseComponentId: string }) {
  const { langAsString } = useLanguage();
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
      loadingLabel={langAsString('general.loading')}
    >
      <Lang id={submitButtonText} />
    </Button>
  );
}
