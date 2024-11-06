import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import type { MetadataOption } from 'app-development/types/MetadataOption';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

type CreateSubformProps = {
  layoutSetName: string;
  onSubformCreated: (layoutSetName: string) => void;
  selectedOption: MetadataOption | null;
};

export const useCreateSubform = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: addLayoutSet } = useAddLayoutSetMutation(org, app);

  const createSubform = ({
    layoutSetName,
    onSubformCreated,
    selectedOption,
  }: CreateSubformProps) => {
    addLayoutSet({
      layoutSetIdToUpdate: layoutSetName,
      layoutSetConfig: {
        id: layoutSetName,
        type: 'subform',
        dataType: selectedOption?.value.fileName,
      },
    });
    onSubformCreated(layoutSetName);
  };

  return { createSubform };
};
