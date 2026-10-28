import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioFieldset, StudioProperty } from '@studio/components';
import { PlusCircleIcon } from '@studio/icons';
import type { FormItem } from '../../../../../types/FormItem';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { BrokerFileTransferMetadataEntry } from './BrokerFileTransferMetadataEntry';
import {
  dataModelFieldOf,
  emptyMetadataDraft,
  MAX_METADATA_ENTRIES,
  type MetadataDraft,
  type MetadataValue,
  toMetadataDraft,
  withMetadataEntry,
  withoutMetadataEntry,
} from './metadataUtils';

type BrokerFileTransferMetadataProps = {
  component: FormItem<ComponentType.BrokerFileTransfer>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const BrokerFileTransferMetadata = ({
  component,
  handleComponentChange,
  className,
}: BrokerFileTransferMetadataProps): React.ReactElement => {
  const { t } = useTranslation();
  // The entry being edited, which is one past the last while one is added
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const entries = Object.entries(component.metadata ?? {});
  const keys = entries.map(([key]) => key);
  const otherKeys = (index: number) => keys.filter((_, keyIndex) => keyIndex !== index);

  const save = (index: number, draft: MetadataDraft) => {
    handleComponentChange({
      ...component,
      metadata: withMetadataEntry(component.metadata, index, draft),
    });
    setOpenIndex(null);
  };

  const remove = (index: number) => {
    if (index < entries.length) {
      handleComponentChange({
        ...component,
        metadata: withoutMetadataEntry(component.metadata, index),
      });
    }
    setOpenIndex(null);
  };

  const describeValue = (value: MetadataValue): string => {
    if (typeof value === 'string') {
      return t('ux_editor.component_properties.metadata.text_summary', { text: value });
    }
    const field = dataModelFieldOf(value);
    return field === null
      ? t('ux_editor.component_properties.metadata.expression_summary')
      : t('ux_editor.component_properties.metadata.field_summary', { field });
  };

  return (
    <StudioFieldset
      legend={t('ux_editor.component_properties.metadata')}
      description={t('ux_editor.component_properties_help_text.metadata')}
      className={className}
    >
      {entries.map(([key, value], index) =>
        openIndex === index ? (
          <BrokerFileTransferMetadataEntry
            key={key}
            initialDraft={toMetadataDraft(key, value)}
            otherKeys={otherKeys(index)}
            onSave={(draft) => save(index, draft)}
            onDelete={() => remove(index)}
          />
        ) : (
          <StudioProperty.Button
            key={key}
            property={key}
            value={describeValue(value)}
            onClick={() => setOpenIndex(index)}
            disabled={openIndex !== null}
          />
        ),
      )}
      {openIndex === entries.length && (
        <BrokerFileTransferMetadataEntry
          initialDraft={emptyMetadataDraft}
          otherKeys={keys}
          onSave={(draft) => save(entries.length, draft)}
          onDelete={() => remove(entries.length)}
        />
      )}
      {openIndex === null && entries.length < MAX_METADATA_ENTRIES && (
        <StudioProperty.Button
          icon={<PlusCircleIcon />}
          property={t('ux_editor.component_properties.metadata.add')}
          onClick={() => setOpenIndex(entries.length)}
        />
      )}
    </StudioFieldset>
  );
};
