import React from 'react';

import { AltinnContentIconFormData } from 'src/components/atoms/AltinnContentIconFormData';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { LoadingProvider } from 'src/core/loading/LoadingContext';
import { Lang } from 'src/features/language/Lang';
import { ProcessTaskType } from 'src/types';

interface LoaderProps {
  reason: string; // The reason is used by developers to identify the reason for the loader
  details?: string;
  renderPresentation?: boolean;
}

export const Loader = ({ renderPresentation = true, ...rest }: LoaderProps) => {
  const { overriddenTaskId } = useTaskStore(({ overriddenTaskId }) => ({
    overriddenTaskId,
  }));

  if (overriddenTaskId) {
    return null;
  }
  if (renderPresentation) {
    return (
      <LoadingProvider reason={rest.reason}>
        <PresentationComponent
          header={<Lang id='instantiate.starting' />}
          type={ProcessTaskType.Unknown}
          renderNavBar={false}
        >
          <InnerLoader {...rest} />
        </PresentationComponent>
      </LoadingProvider>
    );
  }

  return (
    <LoadingProvider reason={rest.reason}>
      <InnerLoader {...rest} />
    </LoadingProvider>
  );
};

const InnerLoader = ({ reason, details }: LoaderProps) => (
  <AltinnContentLoader
    width='100%'
    height='400'
    reason={reason}
    details={details}
  >
    <AltinnContentIconFormData />
  </AltinnContentLoader>
);
