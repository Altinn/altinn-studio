import React from 'react';

import { Button } from 'src/app-components/Button/Button';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useInstantiation } from 'src/features/instantiate/InstantiationContext';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import type { IInstantiationButtonComponentProvidedProps } from 'src/layout/InstantiationButton/InstantiationButtonComponent';

type Props = Omit<React.PropsWithChildren<IInstantiationButtonComponentProvidedProps>, 'text'>;

// TODO(Datamodels): This uses mapping and therefore only supports the "default" data model
export const InstantiationButton = ({ children, ...props }: Props) => {
  const { instantiateWithPrefill, error, isLoading } = useInstantiation();
  const prefill = FD.useMapping(props.mapping, DataModels.useDefaultDataType());
  const party = useCurrentParty();

  const onClick = () => {
    instantiateWithPrefill(props.node, {
      prefill,
      instanceOwner: {
        partyId: party?.partyId.toString(),
      },
    });
  };

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return (
    <Button
      {...props}
      id={props.node.id}
      onClick={onClick}
      isLoading={isLoading}
      variant='secondary'
      color='first'
    >
      {children}
    </Button>
  );
};
