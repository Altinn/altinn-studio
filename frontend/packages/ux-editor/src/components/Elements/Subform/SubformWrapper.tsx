import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import React from 'react';
import { DeleteSubformWrapper } from './DeleteSubformWrapper';

type SubformWrapperProps = {
  layoutSets: LayoutSets;
  selectedLayoutSet: string;
};

export const SubformWrapper = ({
  layoutSets,
  selectedLayoutSet,
}: SubformWrapperProps): React.ReactElement => {
  return (
    <div>
      <DeleteSubformWrapper layoutSets={layoutSets} selectedLayoutSet={selectedLayoutSet} />
    </div>
  );
};
