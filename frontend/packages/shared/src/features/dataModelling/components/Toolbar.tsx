import { CreateNewWrapper, CreateAction } from 'app-shared/features/dataModelling/components/CreateNewWrapper';
import { XSDUpload } from 'app-shared/features/dataModelling/components/XSDUpload';
import { GroupedOption, OnChangeSchema, SchemaSelect } from 'app-shared/features/dataModelling/components/SchemaSelect';
import { DeleteWrapper } from 'app-shared/features/dataModelling/components/DeleteWrapper';
import React from 'react';
import { useParams } from 'react-router-dom';
import { IMetadataOption } from 'app-shared/features/dataModelling/functions/types';

export interface ToolbarProps {
  createNewOpen: boolean;
  createPathOption?: boolean;
  disabled: boolean;
  handleCreateSchema: CreateAction;
  handleDeleteSchema: () => void;
  handleXsdUploaded: (filename: string) => void;
  metadataOptions: GroupedOption[];
  modelNames: string[];
  selectedOption: IMetadataOption | null;
  setCreateNewOpen: (open: boolean) => void;
  setSelectedOption: OnChangeSchema;
}

export const Toolbar = ({
  createNewOpen,
  createPathOption,
  disabled,
  handleCreateSchema,
  handleDeleteSchema,
  handleXsdUploaded,
  metadataOptions,
  modelNames,
  selectedOption,
  setCreateNewOpen,
  setSelectedOption,
}: ToolbarProps) => {
  const { org, app } = useParams<{ org: string; app: string }>();
  return (
    <>
      <CreateNewWrapper
        createAction={handleCreateSchema}
        createPathOption={createPathOption}
        dataModelNames={modelNames}
        disabled={disabled}
        open={createNewOpen}
        setOpen={setCreateNewOpen}
      />
      <XSDUpload
        disabled={disabled}
        onXSDUploaded={handleXsdUploaded}
        org={org}
        repo={app}
      />
      <SchemaSelect
        disabled={disabled}
        onChange={setSelectedOption}
        options={metadataOptions}
        selectedOption={selectedOption}
      />
      <DeleteWrapper
        deleteAction={handleDeleteSchema}
        schemaName={selectedOption?.value && selectedOption?.label}
      />
    </>
  );
};
