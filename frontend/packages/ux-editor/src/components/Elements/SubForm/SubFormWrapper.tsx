import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import React from 'react';
import { CreateSubFormWrapper } from './CreateSubFormWrapper';
import { DeleteSubFormWrapper } from './DeleteSubFormWrapper';
import type { HandleLayoutSetChangeProps } from '../LayoutSetsContainer';

type SubFormWrapperProps = {
  layoutSets: LayoutSets | undefined;
  onSubFormCreated: ({ layoutSet, isNewLayoutSet }: HandleLayoutSetChangeProps) => void;
  selectedLayoutSet: string;
};

export const SubFormWrapper = ({
  layoutSets,
  onSubFormCreated,
  selectedLayoutSet,
}: SubFormWrapperProps): React.ReactElement => {
  return (
    <div>
      <CreateSubFormWrapper layoutSets={layoutSets} onSubFormCreated={onSubFormCreated} />
      <DeleteSubFormWrapper layoutSets={layoutSets} selectedLayoutSet={selectedLayoutSet} />
    </div>
  );
};
