import React, { useEffect, useState, MouseEvent, ReactNode } from 'react';
import { Panel, PanelVariant } from '@altinn/altinn-design-system';
import classes from './TopToolbar.module.css';
import { useTranslation } from 'react-i18next';
import { CogIcon } from '@navikt/aksel-icons';
import {
  Button,
  ButtonVariant,
  ErrorMessage,
  Popover,
  Spinner,
} from '@digdir/design-system-react';
import cn from 'classnames';
import { usePrevious } from 'app-shared/hooks/usePrevious';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { GenerateSchemaState } from 'app-shared/types/global';


export interface TopToolbarProps {
  Toolbar: ReactNode;
  editMode: boolean;
  saveAction?: (payload: any) => void;
  toggleEditMode?: (e: any) => void;
  schemaState: GenerateSchemaState;
}

export function TopToolbar({
  editMode,
  Toolbar,
  saveAction,
  schemaState,
}: TopToolbarProps) {
  const { t } = useTranslation();
  const [showGenerationState, setShowGenerationState] = useState(false);
  const { data } = useDatamodelQuery();
  const { error, saving } = schemaState;
  const generatedSchemaSuccessfully = !saving && !error?.message;

  const schemaString = JSON.stringify(data);
  const prevSchemaState = usePrevious({ data, error, saving });

  useEffect(() => {
    setShowGenerationState(false);
  }, [schemaString]); // Close generation state popover when schema changes

  useEffect(() => {
    if (prevSchemaState?.saving && generatedSchemaSuccessfully) {
      const timer = setTimeout(() => setShowGenerationState(false), 1500); // Make the "saved" massage disappear from the DOM after 1.5 seconds (CSS only handles the fadeout effect)
      return () => clearTimeout(timer);
    }
  }, [prevSchemaState?.saving, generatedSchemaSuccessfully]);

  const handleGenerateButtonClick = (event: MouseEvent) => {
    saveAction && saveAction(event);
    setShowGenerationState(true);
  };

  return (
    <section className={classes.toolbar} role={'toolbar'}>
      {Toolbar}
      <div className={classes.wrapper}>
        <div className={classes.spinnerWrapper}>
          {saving ? (
            <Spinner title={t('general.saving')} />
          ) : (
            <Popover
              className={cn(classes.statusPopover, generatedSchemaSuccessfully && classes.success)}
              open={showGenerationState}
              trigger={
                <Button
                  id='save-model-button'
                  data-testid='save-model-button'
                  onClick={handleGenerateButtonClick}
                  disabled={!editMode || !saveAction}
                  icon={<CogIcon />}
                  variant={ButtonVariant.Quiet}
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
        </div>
      </div>
    </section>
  );
}

TopToolbar.defaultProps = {
  saveAction: undefined,
};
