import { Button, Spinner } from '@digdir/design-system-react';
import { CogIcon } from '@navikt/aksel-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSchemaQuery } from '../../../../hooks/queries';
import { useGenerateModelsMutation } from '../../../../hooks/mutations';
import { toast } from 'react-toastify';

export interface GenerateModelsButtonProps {
  modelPath: string;
  onSetSchemaGenerationErrorMessages: (errorMessages: string[]) => void;
}

export const GenerateModelsButton = ({
  modelPath,
  onSetSchemaGenerationErrorMessages,
}: GenerateModelsButtonProps) => {
  const { data } = useSchemaQuery(modelPath);
  const { mutate, isPending } = useGenerateModelsMutation(modelPath, {
    hideDefaultError: (error) => error?.response?.data?.customErrorMessages ?? false,
  });
  const { t } = useTranslation();

  const handleGenerateButtonClick = () => {
    mutate(data, {
      onSuccess: () => {
        toast.success(t('schema_editor.datamodel_generation_success_message'));
        onSetSchemaGenerationErrorMessages([]);
      },
      onError: (error) => {
        const errorMessages = error?.response?.data?.customErrorMessages;
        if (errorMessages) {
          onSetSchemaGenerationErrorMessages(errorMessages);
        }
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
