import { Button, Spinner } from '@digdir/design-system-react';
import { CogIcon } from '@navikt/aksel-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSchemaQuery } from '../../../../hooks/queries';
import { useGenerateModelsMutation } from '../../../../hooks/mutations';
import { toast } from 'react-toastify';

export interface GenerateModelsButtonProps {
  modelPath: string;
}

export const GenerateModelsButton = ({ modelPath }: GenerateModelsButtonProps) => {
  const { data } = useSchemaQuery(modelPath);
  const { mutate, isPending } = useGenerateModelsMutation(modelPath);
  const { t } = useTranslation();

  const handleGenerateButtonClick = () => {
    mutate(data, {
      onSuccess: () => {
        toast.success(t('schema_editor.datamodel_generation_success_message'));
      },
    });
  };

  return (
    <>
      {isPending ? (
        <Spinner title={t('general.saving')} />
      ) : (
        <Button
          id='save-model-button'
          onClick={handleGenerateButtonClick}
          icon={<CogIcon />}
          variant='tertiary'
          size='small'
        >
          {t('schema_editor.generate_model_files')}
        </Button>
      )}
    </>
  );
};
