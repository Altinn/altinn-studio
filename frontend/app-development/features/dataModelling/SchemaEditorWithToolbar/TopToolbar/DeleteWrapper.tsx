import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@digdir/design-system-react";
import { TrashIcon } from "@navikt/aksel-icons";
import { useDeleteDatamodelMutation } from "../../../../hooks/mutations";
import { MetadataOption } from "../../../../types/MetadataOption";
import { AltinnConfirmDialog } from "app-shared/components";

export interface DeleteWrapperProps {
  selectedOption: MetadataOption | null;
}

export function DeleteWrapper({ selectedOption }: DeleteWrapperProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { t } = useTranslation();
  const { mutate } = useDeleteDatamodelMutation();

  const modelPath = selectedOption?.value.repositoryRelativeUrl;

  if (!modelPath) return null;

  const schemaName = selectedOption?.value && selectedOption?.label;
  const onDeleteClick = () => setDialogOpen(true);
  const onDeleteConfirmClick = () => {
    mutate(modelPath);
    setDialogOpen(false);
  };

  return (
    <AltinnConfirmDialog
      open={dialogOpen}
      confirmText={t("schema_editor.confirm_deletion")}
      onConfirm={onDeleteConfirmClick}
      onClose={() => setDialogOpen(false)}
      trigger={
        <Button
          id="delete-model-button"
          disabled={!schemaName}
          onClick={onDeleteClick}
          color="danger"
          icon={<TrashIcon />}
          variant="quiet"
          size="small"
        >
          {t("schema_editor.delete_data_model")}
        </Button>
      }
    >
      <p>{t("schema_editor.delete_model_confirm", { schemaName })}</p>
    </AltinnConfirmDialog>
  );
}
