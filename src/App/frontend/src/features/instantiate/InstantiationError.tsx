import React from 'react';
import { useParams } from 'react-router-dom';

import { InstantiateValidationError } from 'src/features/instantiate/containers/InstantiateValidationError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { isInstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { isAxiosError } from 'src/utils/isAxiosError';

export function InstantiationError() {
  const error = useParams()?.error;
  const exception = useInstantiation().error;

  if (error === 'forbidden') {
    if (isAxiosError(exception) && isInstantiationValidationResult(exception.response?.data)) {
      return <InstantiateValidationError validationResult={exception.response.data} />;
    }

    return <MissingRolesError />;
  }

  return <UnknownError />;
}
