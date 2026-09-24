import { StudioSaveIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useDataModelGenerationStatusQuery, useSchemaQuery } from '../../../../../hooks/queries';
import { useGenerateModelsMutation } from '../../../../../hooks/mutations';
import { toast } from 'react-toastify';
import { StudioBadge, StudioButton, StudioSpinner } from '@studio/components';
import classes from './GenerateModelsButton.module.css';

export interface GenerateModelsButtonProps {
  modelPath: string;
  onSetSchemaGenerationErrorMessages: (errorMessages: string[]) => void;
}

export const GenerateModelsButton = ({
  modelPath,
  onSetSchemaGenerationErrorMessages,
}: GenerateModelsButtonProps) => {
  const { data } = useSchemaQuery(modelPath);
  const { data: isOutOfDate } = useDataModelGenerationStatusQuery(modelPath);
  const { mutate, isPending } = useGenerateModelsMutation(modelPath, {
    hideDefaultError: (error) => error?.response?.data?.customErrorMessages ?? false,
  });
  const { t } = useTranslation();

  const handleGenerateButtonClick = () => {
    mutate(data, {
      onSuccess: () => {
        toast.success(t('schema_editor.data_model_generation_success_message'));
        onSetSchemaGenerationErrorMessages([]);
      },
      onError: (error) => {
        const customErrorMessages = error?.response?.data?.customErrorMessages || [];
        onSetSchemaGenerationErrorMessages(customErrorMessages);
      },
    });
  };

  return (
    <>
      {isPending ? (
        <StudioSpinner aria-label={t('general.saving')} />
      ) : (
        <StudioButton
          id='save-model-button'
          onClick={handleGenerateButtonClick}
          icon={<StudioSaveIcon />}
          variant='primary'
          className={classes.button}
        >
          {t('schema_editor.generate_model_files')}
          {isOutOfDate && (
            <StudioBadge
              role='status'
              className={classes.badge}
              data-color='danger'
              aria-label={t('schema_editor.generate_model_files_pending')}
            />
          )}
        </StudioButton>
      )}
    </>
  );
};
