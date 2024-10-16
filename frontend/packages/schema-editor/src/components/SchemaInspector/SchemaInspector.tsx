import type { ReactElement } from 'react';
import React from 'react';
import { Alert, Tabs } from '@digdir/designsystemet-react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { isField, isObject } from '@altinn/schema-model';
import { ItemPropertiesTab } from './ItemPropertiesTab';
import { ItemFieldsTab } from './ItemFieldsTab';
import classes from './SchemaInspector.module.css';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { useSavableSchemaModel } from '../../hooks/useSavableSchemaModel';
import { StudioCenter, StudioHeading, StudioParagraph } from '@studio/components';

export const SchemaInspector = (): ReactElement => {
  const { t } = useTranslation();
  const { selectedUniquePointer } = useSchemaEditorAppContext();
  const savableModel = useSavableSchemaModel();
  const selectedItem: UiSchemaNode = selectedUniquePointer
    ? savableModel.getNodeByUniquePointer(selectedUniquePointer)
    : undefined;
  const shouldDisplayFieldsTab = selectedItem && isField(selectedItem) && isObject(selectedItem);

  if (!selectedItem) {
    return (
      <>
        <div className={classes.noItemHeadingContainer}>
          <StudioHeading size='2xs'>{t('schema_editor.properties')}</StudioHeading>
        </div>
        <StudioCenter>
          <StudioParagraph size='sm'>{t('schema_editor.no_item_selected')}</StudioParagraph>
        </StudioCenter>
      </>
    );
  }

  return (
    <Tabs defaultValue={t('schema_editor.properties')}>
      <Tabs.List>
        <Tabs.Tab value={t('schema_editor.properties')} className={classes.tabHeader}>
          {t('schema_editor.properties')}
        </Tabs.Tab>
        <Tabs.Tab value={t('schema_editor.fields')} className={classes.tabHeader}>
          {t('schema_editor.fields')}
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value={t('schema_editor.properties')}>
        <ItemPropertiesTab selectedItem={selectedItem} />
      </Tabs.Content>
      {shouldDisplayFieldsTab ? (
        <Tabs.Content value={t('schema_editor.fields')}>
          <ItemFieldsTab selectedItem={selectedItem} />
        </Tabs.Content>
      ) : (
        <Tabs.Content value={t('schema_editor.fields')}>
          <Alert severity='info'>{t('app_data_modelling.fields_information')}</Alert>
        </Tabs.Content>
      )}
    </Tabs>
  );
};
