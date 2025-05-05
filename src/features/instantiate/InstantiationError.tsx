import React from 'react';
import { useParams } from 'react-router-dom';

import { InstantiateValidationError } from 'src/features/instantiate/containers/InstantiateValidationError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { useInstantiation } from 'src/features/instantiate/InstantiationContext';
import { isAxiosError } from 'src/utils/isAxiosError';

export function InstantiationError() {
  const error = useParams()?.error;
  const exception = useInstantiation().error;

  if (error === 'forbidden') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = isAxiosError(exception) ? (exception.response?.data as any)?.message : undefined;
    if (message) {
      return <InstantiateValidationError message={message} />;
    }

    return <MissingRolesError />;
  }

  return <UnknownError />;
}
