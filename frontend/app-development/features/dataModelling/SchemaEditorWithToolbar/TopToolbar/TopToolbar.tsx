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
  const { mutate: createDataModel } = useCreateDataModelMutation();
  const prevDataModels = usePrevious(dataModels);
  const { selectedTypePointer } = useDataModelToolbarContext();
  const showTypeToolbar: boolean = !!selectedTypePointer;

  useEffect(() => {
    setSelectedOption(computeSelectedOption(selectedOption, dataModels, prevDataModels));
  }, [selectedOption, dataModels, prevDataModels, setSelectedOption]);

  const handleCreateSchema = (model: CreateDataModelMutationArgs) => {
    createDataModel(model);
    setCreateNewOpen(false);
  };

  return (
    <section
      className={cn(classes.toolbar, showTypeToolbar && classes.typeToolbarBackground)}
      role='toolbar'
    >
      {showTypeToolbar ? (
        <TypeToolbar dataModelName={selectedOption.label} />
      ) : (
        <DataModelToolbar
          dataModels={dataModels}
          createNewOpen={createNewOpen}
          setCreateNewOpen={setCreateNewOpen}
          handleCreateSchema={handleCreateSchema}
          createPathOption={createPathOption}
          onSetSchemaGenerationErrorMessages={onSetSchemaGenerationErrorMessages}
        />
      )}
    </section>
  );
}

const TypeToolbar = ({ dataModelName }) => {
  const { setSelectedTypePointer, setSelectedUniquePointer, selectedUniquePointer } =
    useDataModelToolbarContext();

  const navigateToDataModelRoot = () => {
    setSelectedUniquePointer(undefined);
    setSelectedTypePointer(undefined);
  };

  const typeName = selectedUniquePointer.substring(selectedUniquePointer.lastIndexOf('/') + 1);

  const showBreadcrumbs = false;

  return (
    <div className={classes.typeToolbar}>
      {showBreadcrumbs ? (
        <BreadcrumbsToolbar
          navigateToDataModelRoot={navigateToDataModelRoot}
          dataModelName={dataModelName}
          typeName={typeName}
        />
      ) : (
        <BackButtonToolbar
          navigateToDataModelRoot={navigateToDataModelRoot}
          dataModelName={dataModelName}
          typeName={typeName}
        />
      )}
    </div>
  );
};

const BreadcrumbsToolbar = ({ navigateToDataModelRoot, dataModelName, typeName }) => {
  return (
    <div className={classes.breadcrumbs}>
      <Link onClick={() => navigateToDataModelRoot()}>
        Datamodell: <b>{dataModelName}</b>
      </Link>
      <ChevronRightIcon />
      <StudioParagraph size='sm'>
        Type: <b>{typeName}</b>
      </StudioParagraph>
    </div>
  );
};

const BackButtonToolbar = ({ navigateToDataModelRoot, dataModelName, typeName }) => {
  return (
    <>
      <Label size='sm'>
        Type: <b>{typeName}</b>
      </Label>
      <StudioButton onClick={() => navigateToDataModelRoot()} icon={<ArrowLeftIcon />}>
        Tilbake til datamodell <b>{dataModelName}</b>
      </StudioButton>
    </>
  );
};

const DataModelToolbar = ({
  dataModels,
  createNewOpen,
  setCreateNewOpen,
  handleCreateSchema,
  createPathOption,
  onSetSchemaGenerationErrorMessages,
}) => {
  const { selectedOption, setSelectedOption } = useDataModelToolbarContext();
  const { t } = useTranslation();
  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  return (
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
  );
};
