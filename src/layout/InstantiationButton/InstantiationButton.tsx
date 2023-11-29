import React from 'react';

import { useInstantiation } from 'src/features/instantiate/InstantiationContext';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { WrappedButton } from 'src/layout/Button/WrappedButton';
import { mapFormData } from 'src/utils/databindings';
import type { IInstantiationButtonComponentProvidedProps } from 'src/layout/InstantiationButton/InstantiationButtonComponent';

type Props = Omit<React.PropsWithChildren<IInstantiationButtonComponentProvidedProps>, 'text'>;

export const InstantiationButton = ({ children, ...props }: Props) => {
  const instantiation = useInstantiation();
  const formData = useAppSelector((state) => state.formData.formData);
  const party = useCurrentParty();

  const instantiate = () => {
    const prefill = mapFormData(formData, props.mapping);
    instantiation.instantiateWithPrefill(props.node, {
      prefill,
      instanceOwner: {
        partyId: party?.partyId.toString(),
      },
    });
  };
  const busyWithId = instantiation.isLoading ? props.id : '';

  React.useEffect(() => {
    if (instantiation.error) {
      throw new Error('Something went wrong trying to start new instance');
    }
  }, [instantiation.error]);

  return (
    <WrappedButton
      {...props}
      nodeId={props.node.item.id}
      onClick={instantiate}
      busyWithId={busyWithId}
    >
      {children}
    </WrappedButton>
  );
};
