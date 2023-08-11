import classes from './TopToolbar.module.css';
import { Button, ButtonVariant, ErrorMessage, Popover, Spinner } from '@digdir/design-system-react';
import cn from 'classnames';
import { CogIcon } from '@navikt/aksel-icons';
import { Panel, PanelVariant } from '@altinn/altinn-design-system';
import React, { useEffect, useState } from 'react';
import { usePrevious } from 'app-shared/hooks/usePrevious';
import { useTranslation } from 'react-i18next';
import { useSchemaQuery } from '../../../../hooks/queries';
import { useGenerateModelsMutation } from '../../../../hooks/mutations';

export interface GenerateModelsButtonProps {
  modelPath: string;
}

export const GenerateModelsButton = ({ modelPath }: GenerateModelsButtonProps) => {
  const { data } = useSchemaQuery(modelPath);
  const { mutate, isLoading, error, isSuccess } = useGenerateModelsMutation(modelPath);
  const { t } = useTranslation();
  const [showGenerationState, setShowGenerationState] = useState(false);

  const schemaString = JSON.stringify(data);
  const prevSchemaState = usePrevious({ data, error, isLoading });

  useEffect(() => {
    setShowGenerationState(false);
  }, [schemaString]); // Close generation state popover when schema changes

  useEffect(() => {
    if (prevSchemaState?.isLoading && isSuccess) {
      const timer = setTimeout(() => setShowGenerationState(false), 1500); // Make the "saved" massage disappear from the DOM after 1.5 seconds (CSS only handles the fadeout effect)
      return () => clearTimeout(timer);
    }
  }, [prevSchemaState?.isLoading, isSuccess]);

  const handleGenerateButtonClick = () => {
    mutate(data);
    setShowGenerationState(true);
  };

  return (
    <>
      {isLoading ? (
        <Spinner title={t('general.saving')} />
      ) : (
        <Popover
          className={cn(classes.statusPopover, isSuccess && classes.success)}
          open={showGenerationState}
          trigger={
            <Button
              id='save-model-button'
              data-testid='save-model-button'
              onClick={handleGenerateButtonClick}
              icon={<CogIcon />}
              variant={ButtonVariant.Quiet}
              size='small'
            >
              {t('schema_editor.generate_model_files')}
            </Button>
          }
        >
          {error?.message ? (
            <>
              <ErrorMessage role='alertdialog'>{error.message}</ErrorMessage>
              <Button
                onClick={() => setShowGenerationState(false)}
                variant={ButtonVariant.Outline}
                size='small'
              >
                {t('general.close')}
              </Button>
            </>
          ) : (
            <Panel variant={PanelVariant.Success} forceMobileLayout={true}>
              {t('general.saved')}
            </Panel>
          )}
        </Popover>
      )}
    </>
  );
};
