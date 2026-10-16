import React, { useEffect } from 'react';

import { Button } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useProcessNext } from 'src/core/queries/process';
import { useInvalidateSigningQueries } from 'src/core/queries/signeeList';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';

export function SubmitSigningButton({ baseComponentId }: { baseComponentId: string }) {
  const { langAsString } = useLanguage();
  const { mutate: processNext, isPending: isSubmitting, isSuccess } = useProcessNext();

  const config = useComponentConfig(baseComponentId, 'SigningActions');
  const submitButton = useEvalOptionalText(
    config.textResourceBindings?.submitButton,
    Expressions.SigningActions.textResourceBindings.submitButton,
  );

  const invalidateSigningQueries = useInvalidateSigningQueries();

  useEffect(() => {
    invalidateSigningQueries();
  }, [isSuccess, invalidateSigningQueries]);

  const submitButtonText = submitButton ?? 'signing.submit_button';

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
