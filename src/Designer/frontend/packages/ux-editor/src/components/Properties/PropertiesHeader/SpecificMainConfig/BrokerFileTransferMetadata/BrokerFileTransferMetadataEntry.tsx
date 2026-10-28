import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioDeleteButton,
  StudioRadio,
  StudioRadioGroup,
  StudioSelect,
  StudioTextfield,
} from '@studio/components';
import { CheckmarkIcon } from '@studio/icons';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { useValidDataModels } from '../../../../../hooks/useValidDataModels';
import { getDataModelFields } from '../../../../../utils/dataModelUtils';
import { hasMetadataValue, metadataKeyError, type MetadataDraft } from './metadataUtils';
import classes from './BrokerFileTransferMetadata.module.css';

type BrokerFileTransferMetadataEntryProps = {
  initialDraft: MetadataDraft;
  otherKeys: string[];
  onSave: (draft: MetadataDraft) => void;
  onDelete: () => void;
};

export const BrokerFileTransferMetadataEntry = ({
  initialDraft,
  otherKeys,
  onSave,
  onDelete,
}: BrokerFileTransferMetadataEntryProps): React.ReactElement => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initialDraft);
  const [isKeyTouched, setIsKeyTouched] = useState(false);
  const sourceName = useId();
  const { dataModelMetadata } = useValidDataModels('');
  const fields = getDataModelFields({
    componentType: ComponentType.BrokerFileTransfer,
    bindingKey: 'metadata',
    dataModelMetadata,
  });

  const update = (changes: Partial<MetadataDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));
  const keyError = metadataKeyError(draft.key, otherKeys);
  const showKeyError = keyError && (isKeyTouched || draft.key !== '');

  return (
    <StudioCard className={classes.card}>
      <StudioCard.Block className={classes.content}>
        <StudioTextfield
          label={t('ux_editor.component_properties.metadata.key')}
          value={draft.key}
          onChange={(event) => update({ key: event.target.value })}
          onBlur={() => setIsKeyTouched(true)}
          error={
            showKeyError ? t(`ux_editor.component_properties.metadata.${keyError}`) : undefined
          }
        />
        {draft.source === 'expression' ? (
          <StudioAlert>{t('ux_editor.component_properties.metadata.expression_info')}</StudioAlert>
        ) : (
          <>
            <StudioRadioGroup legend={t('ux_editor.component_properties.metadata.source')}>
              <StudioRadio
                checked={draft.source === 'field'}
                label={t('ux_editor.component_properties.metadata.source_field')}
                name={sourceName}
                onChange={() => update({ source: 'field' })}
              />
              <StudioRadio
                checked={draft.source === 'text'}
                label={t('ux_editor.component_properties.metadata.source_text')}
                name={sourceName}
                onChange={() => update({ source: 'text' })}
              />
            </StudioRadioGroup>
            {draft.source === 'field' ? (
              <StudioSelect
                label={t('ux_editor.component_properties.metadata.field')}
                value={draft.field}
                onChange={(event) => update({ field: event.target.value })}
              >
                <StudioSelect.Option value=''>
                  {t('ux_editor.modal_properties_data_model_field_choose')}
                </StudioSelect.Option>
                {fields.map((field) => (
                  <StudioSelect.Option key={field.value} value={field.value}>
                    {field.label}
                  </StudioSelect.Option>
                ))}
              </StudioSelect>
            ) : (
              <StudioTextfield
                label={t('ux_editor.component_properties.metadata.text')}
                value={draft.text}
                onChange={(event) => update({ text: event.target.value })}
              />
            )}
          </>
        )}
        <div className={classes.buttons}>
          <StudioButton
            icon={<CheckmarkIcon />}
            variant='primary'
            disabled={!!keyError || !hasMetadataValue(draft)}
            onClick={() => onSave(draft)}
          >
            {t('ux_editor.component_properties.metadata.save')}
          </StudioButton>
          <StudioDeleteButton onDelete={onDelete}>
            {t('ux_editor.component_properties.metadata.delete')}
          </StudioDeleteButton>
        </div>
      </StudioCard.Block>
    </StudioCard>
  );
};
