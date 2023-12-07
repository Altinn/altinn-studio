import React, { forwardRef } from 'react';
import { StudioModal, StudioSpinner } from '@studio/components';
import { useCreatePartyListMutation } from 'resourceadm/hooks/mutations/useCreatePartyListMutation';
import { Button } from '@digdir/design-system-react';

interface CreatePartyListModalProps {
  org: string;
  env: string;
  onPartyListCreated: (identifier: string) => void;
}

export const CreatePartyListModal = forwardRef<HTMLDialogElement, CreatePartyListModalProps>(
  ({ org, env, onPartyListCreated }, ref): JSX.Element => {
    const { mutate: createPartyList, isPending: isCreatingPartyList } = useCreatePartyListMutation(
      org,
      env,
    );

    const handleCreateNewPartyList = () => {
      const newIdentifier = 'new-resource';
      const newPartyList = {
        env: env,
        id: '',
        identifier: newIdentifier,
        name: 'Ny ressurs',
        description: '',
      };

      createPartyList(newPartyList, {
        onSuccess: () => {
          onPartyListCreated(newIdentifier);
        },
        onError: (error: any) => {
          // TODO
        },
      });
    };

    return (
      <StudioModal
        ref={ref}
        header={'Ny liste'}
        content={
          // TODO: input fields++
          <div>
            {isCreatingPartyList && <StudioSpinner />}
            <Button onClick={() => handleCreateNewPartyList()}>Opprett liste</Button>
          </div>
        }
      />
    );
  },
);

CreatePartyListModal.displayName = 'CreatePartyListModal';
