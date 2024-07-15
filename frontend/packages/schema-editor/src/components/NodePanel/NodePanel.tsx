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
  pointer?: string;
}

export const NodePanel = ({ pointer }: NodePanelProps) => {
  const { schemaModel } = useSchemaEditorAppContext();
  const isDataModelRoot = !pointer;
  const node = isDataModelRoot ? schemaModel.getRootNode() : schemaModel.getNode(pointer);

  return (
    <>
      <div className={classes.top}>
        {!isDataModelRoot && <BackButton />}
        <HeadingRow pointer={pointer} />
      </div>
      {isNodeValidParent(node) && <SchemaTree pointer={pointer} />}
    </>
  );
};

const BackButton = () => {
  const { setSelectedNodePointer, setSelectedTypePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();

  const navigateToDataModelRoot = () => {
    setSelectedNodePointer(undefined);
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
