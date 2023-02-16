import React from 'react';
import { Navigate } from 'react-router-dom';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { InstantiationActions } from 'src/features/instantiate/instantiation/instantiationSlice';
import { WrappedButton } from 'src/layout/Button/WrappedButton';
import { useInstantiateWithPrefillMutation } from 'src/services/InstancesApi';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { mapFormData } from 'src/utils/databindings';
import type { IInstantiationButtonComponentProps } from 'src/layout/InstantiationButton/InstantiationButtonComponent';

type Props = Omit<React.PropsWithChildren<IInstantiationButtonComponentProps>, 'text'>;

export const InstantiationButton = ({ children, ...props }: Props) => {
  const dispatch = useAppDispatch();
  const [instantiateWithPrefill, { isSuccess, data, isLoading, isError }] = useInstantiateWithPrefillMutation();
  const formData = useAppSelector((state) => state.formData.formData);
  const party = useAppSelector((state) => state.party.selectedParty);

  const instantiate = () => {
    const prefill = mapFormData(formData, props.mapping);
    instantiateWithPrefill({
      prefill,
      instanceOwner: {
        partyId: party?.partyId.toString(),
      },
    });
  };
  const busyWithId = props.busyWithId || isLoading ? props.id : '';

  React.useEffect(() => {
    if (isSuccess && data) {
      dispatch(InstanceDataActions.getFulfilled({ instanceData: data }));
      dispatch(AttachmentActions.mapAttachments());
      dispatch(InstantiationActions.instantiateFulfilled({ instanceId: data.id }));
    }
  }, [isSuccess, data, dispatch]);

  React.useEffect(() => {
    if (isError) {
      throw new Error('something went wrong trying to start new instance');
    }
  }, [isError]);

  if (data?.id) {
    return <Navigate to={`/instance/${data.id}`} />;
  }

  return (
    <WrappedButton
      {...props}
      onClick={instantiate}
      busyWithId={busyWithId}
    >
      {children}
    </WrappedButton>
  );
};
