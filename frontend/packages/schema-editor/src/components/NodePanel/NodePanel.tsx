import React from 'react';
import { SchemaTree } from '../SchemaTree';
import { Link } from '@digdir/designsystemet-react';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { ArrowLeftIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './NodePanel.module.css';
import { HeadingRow } from './HeadingRow';
import { isNodeValidParent } from '@altinn/schema-model';

export interface NodePanelProps {
  schemaPointer?: string;
}

export const NodePanel = ({ schemaPointer }: NodePanelProps) => {
  const { schemaModel } = useSchemaEditorAppContext();
  const isDataModelRoot = !schemaPointer;
  const node = isDataModelRoot
    ? schemaModel.getRootNode()
    : schemaModel.getNodeBySchemaPointer(schemaPointer);

  return (
    <>
      <HeadingRow schemaPointer={schemaPointer} />
      {!isDataModelRoot && <BackButton />}
      <div className={classes.content}>
        {isNodeValidParent(node) && <SchemaTree schemaPointer={schemaPointer} />}
      </div>
    </>
  );
};

const BackButton = () => {
  const { setSelectedUniquePointer, setSelectedTypePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();

  const navigateToDataModelRoot = () => {
    setSelectedUniquePointer(undefined);
    setSelectedTypePointer(undefined);
  };

  return (
    <Link asChild className={classes.backButton}>
      <button onClick={navigateToDataModelRoot}>
        <ArrowLeftIcon />
        {t('schema_editor.back_to_data_model')}
      </button>
    </Link>
  );
};
