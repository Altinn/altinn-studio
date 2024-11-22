import { useCreateDataModelMutation } from 'app-development/hooks/mutations';
import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from './useAppContext';

type CreateSubformProps = {
  layoutSetName: string;
  onSubformCreated: (layoutSetName: string) => void;
  dataType: string;
  newDataModel?: boolean;
};

type UseCreateSubformReturn = {
  createSubform: (props: CreateSubformProps) => void;
  isPendingNewSubformMutation: boolean;
};

export const useCreateSubform = (): UseCreateSubformReturn => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: addLayoutSet, isPending: isPendingLayoutSetMutation } = useAddLayoutSetMutation(
    org,
    app,
  );
  const { mutate: createDataModel, isPending: isPendinDataModelMutation } =
    useCreateDataModelMutation();
  const { updateLayoutSetsForPreview } = useAppContext();

  const createSubform = ({
    layoutSetName,
    onSubformCreated,
    dataType,
    newDataModel = false,
  }: CreateSubformProps) => {
    const handleAddLayoutSet = () => {
      addLayoutSet(
        {
          layoutSetIdToUpdate: layoutSetName,
          layoutSetConfig: {
            id: layoutSetName,
            type: 'subform',
            dataType,
          },
        },
        {
          onSuccess: async () => {
            await updateLayoutSetsForPreview();
            onSubformCreated(layoutSetName);
          },
        },
      );
    };

    if (newDataModel) {
      createDataModel(
        {
          name: dataType,
          relativePath: '',
        },
        {
          onSuccess: handleAddLayoutSet,
        },
      );
    } else {
      handleAddLayoutSet();
    }
  };

  const isPendingNewSubformMutation = isPendingLayoutSetMutation || isPendinDataModelMutation;

  return { createSubform, isPendingNewSubformMutation };
};
