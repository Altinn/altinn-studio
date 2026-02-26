import React from 'react';
import ContentLoader from 'react-content-loader';

import { AltinnContentIcon } from 'src/app-components/loading/AltinnContentLoader/AltinnContentIcon';
import { AltinnContentIconFormData } from 'src/app-components/loading/AltinnContentLoader/AltinnContentIconFormData';
import { AltinnContentIconReceipt } from 'src/app-components/loading/AltinnContentLoader/AltinnContentIconReceipt';

type LoaderVariant = 'default' | 'form' | 'receipt';

export interface IAltinnContentLoaderProps {
  reason: string;
  details?: string;

  variant?: LoaderVariant;
  height?: number | string;
  width?: number | string;
}

interface LoaderIconProps {
  variant?: LoaderVariant;
}

function LoaderIcon({ variant }: LoaderIconProps) {
  switch (variant) {
    case 'form':
      return <AltinnContentIconFormData />;
    case 'receipt':
      return <AltinnContentIconReceipt />;
    case 'default':
    default:
      return <AltinnContentIcon />;
  }
}

/**
 * The `data-loading` signals that something is pending and we should not print PDF yet.
 */
export const AltinnContentLoader = ({
  reason,
  details,
  variant,
  width = 400,
  height = 200,
}: IAltinnContentLoaderProps) => (
  <div
    data-loading
    data-testid='loader'
    data-reason={reason}
    data-details={details}
  >
    <ContentLoader
      height={height}
      width={width}
    >
      <LoaderIcon variant={variant} />
    </ContentLoader>
  </div>
);
