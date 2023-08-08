import React, { useState } from 'react';
import { CreateNewWrapper, CreateAction } from 'app-shared/features/dataModelling/components/CreateNewWrapper';
import { XSDUpload } from 'app-shared/features/dataModelling/components/XSDUpload';
import { GroupedOption, OnChangeSchema, SchemaSelect } from 'app-shared/features/dataModelling/components/SchemaSelect';
import { useParams } from 'react-router-dom';
import { IMetadataOption } from 'app-shared/features/dataModelling/functions/types';
import { AltinnConfirmDialog } from 'app-shared/components';
import { useTranslation } from 'react-i18next';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { TrashIcon } from '@navikt/aksel-icons';

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
  const { t } = useTranslation();
  const { org, app } = useParams<{ org: string; app: string }>();
  const schemaName = selectedOption?.value && selectedOption?.label;
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();

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
      <AltinnConfirmDialog
        open={isConfirmDeleteDialogOpen}
        confirmText={t('schema_editor.confirm_deletion')}
        onConfirm={handleDeleteSchema}
        onClose={() => setIsConfirmDeleteDialogOpen(false)}
        placement="bottom"
        trigger={
          <Button
            id='delete-model-button'
            disabled={disabled}
            onClick={() => setIsConfirmDeleteDialogOpen(prevState => !prevState)}
            color={ButtonColor.Danger}
            icon={<TrashIcon />}
            variant={ButtonVariant.Quiet}
          >
            {t('schema_editor.delete_data_model')}
          </Button>
        }
      >
        <p>{t('schema_editor.delete_model_confirm', { schemaName })}</p>
      </AltinnConfirmDialog>
    </>
  );
};
