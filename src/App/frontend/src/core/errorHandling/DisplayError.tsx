import React from 'react';

import { isHttpError } from '@studio/http-client';
import type { HttpError } from '@studio/http-client';

import { InvalidSubformLayoutException } from 'src/features/formData/InvalidSubformLayoutException';
import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { MissingRowIdView } from 'src/features/formData/MissingRowIdView';
import { ForbiddenError } from 'src/features/instantiate/containers/ForbiddenError';
import { InvalidSubformLayoutError } from 'src/features/instantiate/containers/InvalidSubformLayoutError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { HttpStatusCodes } from 'src/utils/network/networking';

interface Props {
  error: Error | HttpError;
}

export function DisplayError({ error }: Props) {
  if (isHttpError(error) && error.response?.status === HttpStatusCodes.Forbidden) {
    return <ForbiddenError />;
  }

  if (error instanceof MissingRowIdException) {
    return <MissingRowIdView error={error} />;
  }

  if (error instanceof InvalidSubformLayoutException) {
    return <InvalidSubformLayoutError error={error} />;
  }

  return <UnknownError error={error} />;
}
