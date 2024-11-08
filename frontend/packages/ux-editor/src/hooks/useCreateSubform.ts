import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

type CreateSubformProps = {
  layoutSetName: string;
  onSubformCreated: (layoutSetName: string) => void;
  dataType?: string;
};

export const useCreateSubform = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: addLayoutSet } = useAddLayoutSetMutation(org, app);

  const createSubform = ({ layoutSetName, onSubformCreated, dataType }: CreateSubformProps) => {
    addLayoutSet({
      layoutSetIdToUpdate: layoutSetName,
      layoutSetConfig: {
        id: layoutSetName,
        type: 'subform',
        dataType,
      },
    });
    onSubformCreated(layoutSetName);
  };

  return { createSubform };
};
