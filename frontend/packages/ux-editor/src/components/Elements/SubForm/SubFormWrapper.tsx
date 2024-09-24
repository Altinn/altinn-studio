import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import React from 'react';
import { CreateSubFormWrapper } from './CreateSubFormWrapper';
import { DeleteSubFormWrapper } from './DeleteSubFormWrapper';

type SubFormWrapperProps = {
  layoutSets: LayoutSets | undefined;
  onSubFormCreated: (subFormName: string) => void;
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
