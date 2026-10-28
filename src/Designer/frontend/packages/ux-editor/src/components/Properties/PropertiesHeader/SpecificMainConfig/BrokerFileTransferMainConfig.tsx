import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { ConfigNumberProperties } from '../../../config/ConfigProperties/ConfigNumberProperties';
import { EditBooleanValue } from '../../../config/editModal/EditBooleanValue';
import { EditStringValue } from '../../../config/editModal/EditStringValue';
import { getBooleanDefault, getComponentDefinition } from '../../../../data/componentCatalog';
import { BrokerFileTransferMetadata } from './BrokerFileTransferMetadata/BrokerFileTransferMetadata';

const brokerFileTransferMainStringProperties = ['resourceId'];
const brokerFileTransferMainNumberProperties = ['maxFileTransferSizeInMB'];

type BrokerFileTransferMainConfigProps = {
  component: FormItem<ComponentType.BrokerFileTransfer>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const BrokerFileTransferMainConfig = ({
  component,
  handleComponentChange,
  className,
}: BrokerFileTransferMainConfigProps): React.ReactElement => {
  const properties = getComponentDefinition(component.type)?.properties ?? {};

  // Like the allowed file types: switching off removes the recipients the switch let you enter
  const handleRecipientsSwitch = (updatedComponent: FormItem<ComponentType.BrokerFileTransfer>) =>
    handleComponentChange(
      updatedComponent.hasCustomRecipients
        ? updatedComponent
        : { ...updatedComponent, recipients: undefined },
    );

  return (
    <>
      <ConfigStringProperties
        component={component}
        handleComponentUpdate={handleComponentChange}
        properties={properties}
        stringPropertyKeys={brokerFileTransferMainStringProperties}
        className={className}
      />
      <EditBooleanValue
        component={component}
        handleComponentChange={handleRecipientsSwitch}
        propertyKey='hasCustomRecipients'
        defaultValue={getBooleanDefault(properties.hasCustomRecipients)}
        definition={properties.hasCustomRecipients}
        className={className}
      />
      {component.hasCustomRecipients && (
        <EditStringValue
          component={component}
          handleComponentChange={handleComponentChange}
          propertyKey='recipients'
          definition={properties.recipients}
          className={className}
        />
      )}
      <BrokerFileTransferMetadata
        component={component}
        handleComponentChange={handleComponentChange}
        className={className}
      />
      <ConfigNumberProperties
        component={component}
        handleComponentUpdate={handleComponentChange}
        properties={properties}
        numberPropertyKeys={brokerFileTransferMainNumberProperties}
        className={className}
      />
      {/* ConfigBooleanProperties would also show the allowed file types here */}
      <EditBooleanValue
        component={component}
        handleComponentChange={handleComponentChange}
        propertyKey='disableVirusScan'
        defaultValue={getBooleanDefault(properties.disableVirusScan)}
        definition={properties.disableVirusScan}
        className={className}
      />
    </>
  );
};
