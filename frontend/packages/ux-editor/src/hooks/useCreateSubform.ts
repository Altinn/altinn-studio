import { useAddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

type CreateSubformProps = {
  layoutSetName: string;
  onSubformCreated: (layoutSetName: string) => void;
};

type UseCreateSubformReturn = {
  createSubform: (props: CreateSubformProps) => void;
  isPendingLayoutSetMutation: boolean;
};

export const useCreateSubform = (): UseCreateSubformReturn => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: addLayoutSet, isPending: isPendingLayoutSetMutation } = useAddLayoutSetMutation(
    org,
    app,
  );

  const createSubform = ({ layoutSetName, onSubformCreated }: CreateSubformProps) => {
    addLayoutSet(
      {
        layoutSetIdToUpdate: layoutSetName,
        layoutSetConfig: {
          id: layoutSetName,
          type: 'subform',
        },
      },
      {
        onSuccess: () => {
          onSubformCreated(layoutSetName);
        },
      },
    );
  };

  return { createSubform, isPendingLayoutSetMutation };
};
