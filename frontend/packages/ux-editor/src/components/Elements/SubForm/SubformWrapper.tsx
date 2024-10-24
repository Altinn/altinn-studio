import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import React from 'react';
import { CreateSubformWrapper } from './CreateSubformWrapper';
import { DeleteSubformWrapper } from './DeleteSubformWrapper';

type SubformWrapperProps = {
  layoutSets: LayoutSets;
  onSubformCreated: (layoutSetName: string) => void;
  selectedLayoutSet: string;
};

export const SubformWrapper = ({
  layoutSets,
  onSubformCreated,
  selectedLayoutSet,
}: SubformWrapperProps): React.ReactElement => {
  return (
    <div>
      <CreateSubformWrapper layoutSets={layoutSets} onSubformCreated={onSubformCreated} />
      <DeleteSubformWrapper layoutSets={layoutSets} selectedLayoutSet={selectedLayoutSet} />
    </div>
  );
};
