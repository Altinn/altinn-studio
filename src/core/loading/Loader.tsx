import React from 'react';

import { AltinnContentIconFormData } from 'src/components/atoms/AltinnContentIconFormData';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { Lang } from 'src/features/language/Lang';
import { useTaskStore } from 'src/layout/Summary2/taskIdStore';
import { ProcessTaskType } from 'src/types';

interface LoaderProps {
  reason: string; // The reason is used by developers to identify the reason for the loader
  details?: string;
  renderPresentation?: boolean;
}

export const Loader = ({ reason, details, renderPresentation = true }: LoaderProps) => {
  const { overriddenTaskId } = useTaskStore(({ overriddenTaskId }) => ({
    overriddenTaskId,
  }));

  if (overriddenTaskId) {
    return null;
  }

  if (renderPresentation) {
    return (
      <PresentationComponent
        header={<Lang id='instantiate.starting' />}
        type={ProcessTaskType.Unknown}
        renderNavBar={false}
        runNavigationEffect={false}
      >
        <AltinnContentLoader
          width='100%'
          height='400'
          reason={reason}
          details={details}
        >
          <AltinnContentIconFormData />
        </AltinnContentLoader>
      </PresentationComponent>
    );
  }

  return (
    <AltinnContentLoader
      width='100%'
      height='400'
      reason={reason}
      details={details}
    >
      <AltinnContentIconFormData />
    </AltinnContentLoader>
  );
};
