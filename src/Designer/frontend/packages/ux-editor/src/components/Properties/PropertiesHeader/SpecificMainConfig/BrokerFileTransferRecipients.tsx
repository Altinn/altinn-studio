import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataLookupFuncName,
  StudioAlert,
  StudioFieldset,
  StudioRadio,
  StudioSelect,
} from '@designer/components';
import type { PropertyDefinition } from '@app/layout-contract';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { FormItem } from '../../../../types/FormItem';
import { EditStringValue } from '../../../config/editModal/EditStringValue';
import { useValidDataModels } from '../../../../hooks/useValidDataModels';
import { getDataModelFields } from '../../../../utils/dataModelUtils';
import { dataModelFieldOf } from './BrokerFileTransferMetadata/metadataUtils';

type Recipients = FormItem<ComponentType.BrokerFileTransfer>['recipients'];
type ChosenSource = 'field' | 'text';
type RecipientsSource = ChosenSource | 'expression';

type BrokerFileTransferRecipientsProps = {
  component: FormItem<ComponentType.BrokerFileTransfer>;
  handleComponentChange: (component: FormItem) => void;
  definition?: PropertyDefinition;
  className?: string;
};

export const BrokerFileTransferRecipients = ({
  component,
  handleComponentChange,
  definition,
  className,
}: BrokerFileTransferRecipientsProps): React.ReactElement => {
  const { t } = useTranslation();
  const sourceName = useId();
  const { recipients } = component;
  const field = recipients === undefined ? null : dataModelFieldOf(recipients);
  // Recipients are only saved once entered, so the choice is kept here until then
  const [chosenSource, setChosenSource] = useState<ChosenSource>(
    typeof recipients === 'string' ? 'text' : 'field',
  );
  const source = sourceOf(recipients, field, chosenSource);

  const changeSource = (newSource: ChosenSource) => {
    setChosenSource(newSource);
    if (recipients !== undefined) {
      handleComponentChange({ ...component, recipients: undefined });
    }
  };

  const changeField = (newField: string) =>
    handleComponentChange({
      ...component,
      recipients: newField ? [DataLookupFuncName.DataModel, newField] : undefined,
    });

  return (
    <StudioFieldset
      legend={t('ux_editor.component_properties.recipients.source')}
      className={className}
    >
      {source === 'expression' ? (
        <StudioAlert>{t('ux_editor.component_properties.recipients.expression_info')}</StudioAlert>
      ) : (
        <>
          <StudioRadio
            checked={source === 'field'}
            label={t('ux_editor.component_properties.recipients.source_field')}
            name={sourceName}
            onChange={() => changeSource('field')}
          />
          <StudioRadio
            checked={source === 'text'}
            label={t('ux_editor.component_properties.recipients.source_text')}
            name={sourceName}
            onChange={() => changeSource('text')}
          />
          {source === 'field' ? (
            <RecipientsField field={field ?? ''} onChange={changeField} />
          ) : (
            <EditStringValue
              // Starting from '' keeps the input controlled once something is typed
              component={{ ...component, recipients: recipients ?? '' }}
              handleComponentChange={handleComponentChange}
              propertyKey='recipients'
              definition={definition}
            />
          )}
        </>
      )}
    </StudioFieldset>
  );
};

function sourceOf(
  recipients: Recipients,
  field: string | null,
  chosenSource: ChosenSource,
): RecipientsSource {
  if (recipients === undefined) return chosenSource;
  if (typeof recipients === 'string') return 'text';
  return field === null ? 'expression' : 'field';
}

type RecipientsFieldProps = {
  field: string;
  onChange: (field: string) => void;
};

const RecipientsField = ({ field, onChange }: RecipientsFieldProps): React.ReactElement => {
  const { t } = useTranslation();
  const { dataModelMetadata } = useValidDataModels('');
  const fields = getDataModelFields({
    componentType: ComponentType.BrokerFileTransfer,
    bindingKey: 'recipients',
    dataModelMetadata,
  });

  return (
    <StudioSelect
      label={t('ux_editor.component_properties.recipients.field')}
      description={t('ux_editor.component_properties.recipients.field_description')}
      value={field}
      onChange={(event) => onChange(event.target.value)}
    >
      <StudioSelect.Option value=''>
        {t('ux_editor.modal_properties_data_model_field_choose')}
      </StudioSelect.Option>
      {fields.map((option) => (
        <StudioSelect.Option key={option.value} value={option.value}>
          {option.label}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};
