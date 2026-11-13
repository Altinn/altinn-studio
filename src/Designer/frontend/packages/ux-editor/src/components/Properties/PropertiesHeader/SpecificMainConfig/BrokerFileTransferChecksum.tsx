import React from 'react';
import { StudioSwitch } from '@designer/components';
import { FormField } from 'app-shared/components/FormField';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { FormItem } from '../../../../types/FormItem';
import { useComponentPropertyHelpText, useComponentPropertyLabel } from '../../../../hooks';

type BrokerFileTransferComponent = FormItem<ComponentType.BrokerFileTransfer>;

type BrokerFileTransferChecksumProps = {
  component: BrokerFileTransferComponent;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

/** Shows the checksum setting as two switches: one for the field and one for making it required */
export const BrokerFileTransferChecksum = ({
  component,
  handleComponentChange,
  className,
}: BrokerFileTransferChecksumProps): React.ReactElement => {
  const { checksumField } = component;

  const changeChecksumField = (newChecksumField: BrokerFileTransferComponent['checksumField']) =>
    handleComponentChange({ ...component, checksumField: newChecksumField });

  return (
    <>
      <ChecksumSwitch
        component={component}
        propertyKey='checksumField'
        checked={!!checksumField}
        onChange={(checked) => changeChecksumField(checked ? 'optional' : undefined)}
        className={className}
      />
      {checksumField && (
        <ChecksumSwitch
          component={component}
          propertyKey='checksumField_required'
          checked={checksumField === 'required'}
          onChange={(checked) => changeChecksumField(checked ? 'required' : 'optional')}
          className={className}
        />
      )}
    </>
  );
};

type ChecksumSwitchProps = {
  component: BrokerFileTransferComponent;
  propertyKey: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

function ChecksumSwitch({
  component,
  propertyKey,
  checked,
  onChange,
  className,
}: ChecksumSwitchProps): React.ReactElement {
  const componentPropertyLabel = useComponentPropertyLabel();
  const componentPropertyHelpText = useComponentPropertyHelpText();

  return (
    <FormField
      id={component.id}
      value={checked}
      onChange={onChange}
      componentType={component.type}
      helpText={componentPropertyHelpText(propertyKey)}
      className={className}
      renderField={({ fieldProps }) => (
        <StudioSwitch
          data-size='sm'
          {...fieldProps}
          checked={fieldProps.value}
          onChange={(e) => fieldProps.onChange(e.target.checked, e)}
          id={`${propertyKey}-checkbox-${component.id}`}
          label={componentPropertyLabel(propertyKey)}
        />
      )}
    />
  );
}
