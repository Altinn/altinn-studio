import React from 'react';

import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from 'src/app-components/Button/Button';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { Lang } from 'src/features/language/Lang';
import { signingQueries } from 'src/layout/SigneeList/api';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function SubmitSigningButton({ node }: { node: LayoutNode<'SigningActions'> }) {
  const processNext = useProcessNext();

  const { textResourceBindings } = useItemWhenType(node.baseId, 'SigningActions');
  const queryClient = useQueryClient();
  const isAnyProcessing = useIsMutating() > 0;

  const {
    mutate: handleSubmit,
    isPending: isSubmitting,
    isSuccess,
  } = useMutation({
    mutationFn: async () => {
      await processNext();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: signingQueries.all });
    },
  });

  const submitButtonText = textResourceBindings?.submitButton ?? 'signing.submit_button';

  return (
    <Button
      onClick={() => handleSubmit()}
      size='md'
      color='success'
      disabled={isAnyProcessing || isSuccess}
      isLoading={isSubmitting}
    >
      <Lang id={submitButtonText} />
    </Button>
  );
}
