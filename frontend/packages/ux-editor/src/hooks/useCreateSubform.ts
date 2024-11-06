import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useEffect } from 'react';

type CreateSubformProps = {
  layoutSetName: string;
  onSubformCreated: (layoutSetName: string) => void;
};

export const useCreateSubform = ({ layoutSetName, onSubformCreated }: CreateSubformProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: addLayoutSet, isSuccess } = useAddLayoutSetMutation(org, app);

  useEffect(() => {
    if (isSuccess) {
      onSubformCreated(layoutSetName);
    }
  }, [isSuccess, layoutSetName, onSubformCreated]);

  const createSubform = () => {
    addLayoutSet({
      layoutSetIdToUpdate: layoutSetName,
      layoutSetConfig: {
        id: layoutSetName,
        type: 'subform',
      },
    });
  };

  return { createSubform };
};
