import React from 'react';

import { FD } from 'src/features/formData/FormDataWrite';
import { useInstantiation } from 'src/features/instantiate/InstantiationContext';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { WrappedButton } from 'src/layout/Button/WrappedButton';
import type { IInstantiationButtonComponentProvidedProps } from 'src/layout/InstantiationButton/InstantiationButtonComponent';

type Props = Omit<React.PropsWithChildren<IInstantiationButtonComponentProvidedProps>, 'text'>;

export const InstantiationButton = ({ children, ...props }: Props) => {
  const { instantiateWithPrefill, error, isLoading } = useInstantiation();
  const prefill = FD.useMapping(props.mapping);
  const party = useCurrentParty();

  const instantiate = () => {
    instantiateWithPrefill(props.node, {
      prefill,
      instanceOwner: {
        partyId: party?.partyId.toString(),
      },
    });
  };
  const busyWithId = isLoading ? props.id : '';

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

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
