import React from 'react';
import { CreateSubformWrapper } from './CreateSubformWrapper';
import { DeleteSubformWrapper } from './DeleteSubformWrapper';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';

type SubformWrapperProps = {
  onSubformCreated: (layoutSetName: string) => void;
  selectedLayoutSet: string;
};

export const SubformWrapper = ({
  onSubformCreated,
  selectedLayoutSet,
}: SubformWrapperProps): React.ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsResponse } = useLayoutSetsQuery(org, app);
  return (
    <div>
      <CreateSubformWrapper layoutSets={layoutSetsResponse} onSubformCreated={onSubformCreated} />
      <DeleteSubformWrapper layoutSets={layoutSetsResponse} selectedLayoutSet={selectedLayoutSet} />
    </div>
  );
};
