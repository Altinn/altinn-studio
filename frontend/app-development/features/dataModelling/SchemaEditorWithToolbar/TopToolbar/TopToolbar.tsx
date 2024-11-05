import React, { useEffect } from 'react';
import classes from './TopToolbar.module.css';
import { CreateNewWrapper } from './CreateNewWrapper';
import { XSDUpload } from './XSDUpload';
import { SchemaSelect } from './SchemaSelect';
// import { DeleteWrapper } from './DeleteWrapper';
import { computeSelectedOption } from '../../../../utils/metadataUtils';
import type { CreateDataModelMutationArgs } from '../../../../hooks/mutations/useCreateDataModelMutation';
import { useCreateDataModelMutation } from '../../../../hooks/mutations';
import type { MetadataOption } from '../../../../types/MetadataOption';
import { GenerateModelsButton } from './GenerateModelsButton';
import { StudioButton, StudioParagraph, usePrevious } from '@studio/components';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { useTranslation } from 'react-i18next';
import { Label, Link } from '@digdir/designsystemet-react';
import { ArrowLeftIcon, ChevronRightIcon } from '@studio/icons';
import cn from 'classnames';
import { useDataModelToolbarContext } from '@altinn/schema-editor/contexts/DataModelToolbarContext';

export interface TopToolbarProps {
  createNewOpen: boolean;
  createPathOption?: boolean;
  dataModels: DataModelMetadata[];
  selectedOption?: MetadataOption;
  setCreateNewOpen: (open: boolean) => void;
  setSelectedOption: (option?: MetadataOption) => void;
  onSetSchemaGenerationErrorMessages: (errorMessages: string[]) => void;
}

export function TopToolbar({
  createNewOpen,
  createPathOption,
  dataModels,
  selectedOption,
  setCreateNewOpen,
  setSelectedOption,
  onSetSchemaGenerationErrorMessages,
}: TopToolbarProps) {
  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  const { t } = useTranslation();
  const { mutate: createDataModel } = useCreateDataModelMutation();
  const prevDataModels = usePrevious(dataModels);

  const { selectedTypePointer } = useDataModelToolbarContext();

  useEffect(() => {
    setSelectedOption(computeSelectedOption(selectedOption, dataModels, prevDataModels));
  }, [selectedOption, dataModels, prevDataModels, setSelectedOption]);

  const handleCreateSchema = (model: CreateDataModelMutationArgs) => {
    createDataModel(model);
    setCreateNewOpen(false);
  };

  const showTypeToolbar = !!selectedTypePointer;

  return (
    <section
      className={cn(classes.toolbar, showTypeToolbar && classes.blueBackground)}
      role='toolbar'
    >
      {showTypeToolbar ? (
        <TypeControls dataModelName={selectedOption.label} />
      ) : (
        <>
          <SchemaSelect
            dataModels={dataModels}
            disabled={false}
            selectedOption={selectedOption}
            setSelectedOption={setSelectedOption}
          />
          <CreateNewWrapper
            dataModels={dataModels}
            disabled={false}
            createNewOpen={createNewOpen}
            setCreateNewOpen={setCreateNewOpen}
            handleCreateSchema={handleCreateSchema}
            createPathOption={createPathOption}
          />
          <XSDUpload
            selectedOption={selectedOption}
            uploadButtonText={t('app_data_modelling.upload_xsd')}
          />
          <VerticalDivider />
          {/*<DeleteWrapper selectedOption={selectedOption} />*/}
          {modelPath && (
            <GenerateModelsButton
              modelPath={modelPath}
              onSetSchemaGenerationErrorMessages={(errorMessages: string[]) =>
                onSetSchemaGenerationErrorMessages(errorMessages)
              }
            />
          )}
        </>
      )}
    </section>
  );
}

const VerticalDivider = () => {
  return (
    <div
      style={{
        borderLeft: '1px solid lightgray',
        height: '66.6%',
      }}
    />
  );
};

const TypeControls = ({ dataModelName }) => {
  const { setSelectedTypePointer, setSelectedUniquePointer, selectedUniquePointer } =
    useDataModelToolbarContext();

  const showBreadcrumbs = false;
  const navigateToDataModelRoot = () => {
    setSelectedUniquePointer(undefined);
    setSelectedTypePointer(undefined);
  };

  const typeName = selectedUniquePointer.substring(selectedUniquePointer.lastIndexOf('/') + 1);

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {showBreadcrumbs ? (
        <>
          <div
            style={{
              width: 'fit-content',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--fds-spacing-4)',
            }}
          >
            <Link onClick={() => navigateToDataModelRoot()}>
              Datamodell: <b>{dataModelName}</b>
            </Link>
            <ChevronRightIcon />
            <StudioParagraph size='sm'>
              Type: <b>{typeName}</b>
            </StudioParagraph>
          </div>
          {/*<StudioButton icon={<ArrowLeftIcon />}>Tilbake til datamodell</StudioButton>*/}
        </>
      ) : (
        <>
          <div>
            <Label size='sm'>
              Type: <b>{typeName}</b>
            </Label>
          </div>
          <StudioButton onClick={() => navigateToDataModelRoot()} icon={<ArrowLeftIcon />}>
            Tilbake til datamodell <b>{dataModelName}</b>
          </StudioButton>
        </>
      )}
    </div>
  );
};
