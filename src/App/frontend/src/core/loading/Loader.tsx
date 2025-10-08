import React from 'react';

import { AltinnContentIconFormData } from 'src/components/atoms/AltinnContentIconFormData';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { PresentationComponent, useHasPresentation } from 'src/components/presentation/Presentation';
import { LoadingProvider } from 'src/core/loading/LoadingContext';
import { Lang } from 'src/features/language/Lang';

interface LoaderProps {
  reason: string; // The reason is used by developers to identify the reason for the loader
  details?: string;
}

export const Loader = (props: LoaderProps) => {
  const hasPresentation = useHasPresentation();

  if (!hasPresentation) {
    return (
      <LoadingProvider reason={props.reason}>
        <PresentationComponent
          header={<Lang id='instantiate.starting' />}
          showNavbar={false}
          showNavigation={false}
        >
          <InnerLoader {...props} />
        </PresentationComponent>
      </LoadingProvider>
    );
  }

  return (
    <LoadingProvider reason={props.reason}>
      <InnerLoader {...props} />
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
