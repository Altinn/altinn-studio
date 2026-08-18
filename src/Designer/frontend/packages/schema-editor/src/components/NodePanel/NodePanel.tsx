import { SchemaTree } from '../SchemaTree';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { ArrowLeftIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './NodePanel.module.css';
import { HeadingRow } from './HeadingRow';
import { isNodeValidParent } from '@altinn/schema-model';
import { StudioButton } from '@studio/components';

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
      <div className={classes.top}>
        {!isDataModelRoot && <BackButton />}
        <HeadingRow schemaPointer={schemaPointer} />
      </div>
      {isNodeValidParent(node) && <SchemaTree schemaPointer={schemaPointer} />}
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
    <StudioButton
      onClick={navigateToDataModelRoot}
      variant='tertiary'
      className={classes.backButton}
      icon={<ArrowLeftIcon />}
    >
      {t('schema_editor.back_to_data_model')}
    </StudioButton>
  );
};
