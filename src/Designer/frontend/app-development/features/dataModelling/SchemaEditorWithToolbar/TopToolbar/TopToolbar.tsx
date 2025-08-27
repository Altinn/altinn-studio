import React, { useEffect } from 'react';
import classes from './TopToolbar.module.css';
import { CreateNewWrapper } from './CreateNewWrapper';
import { XSDUpload } from './XSDUpload';
import { SchemaSelect } from './SchemaSelect';
import { DeleteWrapper } from './DeleteWrapper';
import { computeSelectedOption } from '../../../../utils/metadataUtils';
import type { MetadataOption } from '../../../../types/MetadataOption';
import { GenerateModelsButton } from './GenerateModelsButton';
import { usePrevious } from '@studio/components-legacy';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { useTranslation } from 'react-i18next';

export interface TopToolbarProps {
  isCreateNewOpen: boolean;
  createPathOption?: boolean;
  dataModels: DataModelMetadata[];
  selectedOption?: MetadataOption;
  setIsCreateNewOpen: (open: boolean) => void;
  setSelectedOption: (option?: MetadataOption) => void;
  onSetSchemaGenerationErrorMessages: (errorMessages: string[]) => void;
  canUseUploadXSDFeature?: boolean;
}

export function TopToolbar({
  isCreateNewOpen,
  createPathOption,
  dataModels,
  selectedOption,
  setIsCreateNewOpen,
  setSelectedOption,
  onSetSchemaGenerationErrorMessages,
  canUseUploadXSDFeature = false,
}: TopToolbarProps) {
  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  const { t } = useTranslation();
  const prevDataModels = usePrevious(dataModels);

  useEffect(() => {
    setSelectedOption(computeSelectedOption(selectedOption, dataModels, prevDataModels));
  }, [selectedOption, dataModels, prevDataModels, setSelectedOption]);

  return (
    <section className={classes.toolbar} role='toolbar'>
      <CreateNewWrapper
        dataModels={dataModels}
        disabled={false}
        isCreateNewOpen={isCreateNewOpen}
        setIsCreateNewOpen={setIsCreateNewOpen}
        createPathOption={createPathOption}
      />
      {canUseUploadXSDFeature && (
        <XSDUpload
          selectedOption={selectedOption}
          uploadButtonText={t('app_data_modelling.upload_xsd')}
        />
      )}
      <SchemaSelect
        dataModels={dataModels}
        disabled={false}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
      />
      <DeleteWrapper selectedOption={selectedOption} />
      <div className={classes.right}>
        <div className={classes.generateButtonWrapper}>
          {modelPath && (
            <GenerateModelsButton
              modelPath={modelPath}
              onSetSchemaGenerationErrorMessages={(errorMessages: string[]) =>
                onSetSchemaGenerationErrorMessages(errorMessages)
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
