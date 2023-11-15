import React from 'react';

import type { AxiosError } from 'axios';

import { ForbiddenError } from 'src/features/instantiate/containers/ForbiddenError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { isAxiosError } from 'src/utils/network/sharedNetworking';

interface Props {
  error: Error | AxiosError;
}

export function DisplayError({ error }: Props) {
  if (isAxiosError(error) && error.response?.status === 403) {
    return <ForbiddenError />;
  }

  return <UnknownError />;
}
