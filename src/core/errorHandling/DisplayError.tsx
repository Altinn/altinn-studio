import React from 'react';

import type { AxiosError } from 'axios';

import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { MissingRowIdView } from 'src/features/formData/MissingRowIdView';
import { ForbiddenError } from 'src/features/instantiate/containers/ForbiddenError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';

interface Props {
  error: Error | AxiosError;
}

export function DisplayError({ error }: Props) {
  if (isAxiosError(error) && error.response?.status === HttpStatusCodes.Forbidden) {
    return <ForbiddenError />;
  }

  if (error instanceof MissingRowIdException) {
    return <MissingRowIdView error={error} />;
  }

  return <UnknownError />;
}
