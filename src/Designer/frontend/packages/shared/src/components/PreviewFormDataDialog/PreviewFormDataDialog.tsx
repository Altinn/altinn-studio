import type { ChangeEvent, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioSelect,
  StudioSpinner,
  StudioTextarea,
  StudioValidationMessage,
} from '@designer/components';
import { usePreviewFormDataQuery } from 'app-shared/hooks/queries/usePreviewFormDataQuery';
import { useUpdatePreviewFormDataMutation } from 'app-shared/hooks/mutations/useUpdatePreviewFormDataMutation';
import type { PreviewFormDataElement } from 'app-shared/types/api/PreviewSession';
import classes from './PreviewFormDataDialog.module.css';

export type PreviewFormDataDialogProps = {
  org: string;
  app: string;
  sessionUrl: string;
  instanceId: string;
  open: boolean;
  onClose: () => void;
  /** Called when the data is saved, so the preview can show it. */
  onSaved: () => void;
};

/**
 * The form data of the instance in preview, as JSON, which the developer can change. Preview doesn't run the app's
 * code, so this is how a form gets data that the code would fill in, such as prefill from another system.
 */
export const PreviewFormDataDialog = ({
  org,
  app,
  sessionUrl,
  instanceId,
  open,
  onClose,
  onSaved,
}: PreviewFormDataDialogProps): ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data, isPending, isError } = usePreviewFormDataQuery(
    org,
    app,
    sessionUrl,
    instanceId,
    open,
  );

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  return (
    <StudioDialog ref={dialogRef} closedby='any' onClose={onClose} className={classes.dialog}>
      <StudioDialog.Block>
        <StudioHeading level={2}>{t('ux_editor.preview.form_data.heading')}</StudioHeading>
        <StudioParagraph>{t('ux_editor.preview.form_data.description')}</StudioParagraph>
      </StudioDialog.Block>
      <StudioDialog.Block>
        {!open ? null : isPending ? (
          <StudioSpinner aria-hidden spinnerTitle={t('general.loading')} />
        ) : isError ? (
          <StudioValidationMessage>{t('general.fetch_error_message')}</StudioValidationMessage>
        ) : data.dataElements.length === 0 ? (
          <StudioParagraph>{t('ux_editor.preview.form_data.none')}</StudioParagraph>
        ) : (
          <FormDataEditor
            org={org}
            app={app}
            sessionUrl={sessionUrl}
            instanceId={instanceId}
            dataElements={data.dataElements}
            onCancel={onClose}
            onSaved={onSaved}
          />
        )}
      </StudioDialog.Block>
    </StudioDialog>
  );
};

type FormDataEditorProps = {
  org: string;
  app: string;
  sessionUrl: string;
  instanceId: string;
  dataElements: PreviewFormDataElement[];
  onCancel: () => void;
  onSaved: () => void;
};

const FormDataEditor = ({
  org,
  app,
  sessionUrl,
  instanceId,
  dataElements,
  onCancel,
  onSaved,
}: FormDataEditorProps): ReactElement => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>(dataElements[0].id);
  const element = dataElements.find(({ id }) => id === selectedId) ?? dataElements[0];
  const [texts, setTexts] = useState<Record<string, string>>({});
  const text = texts[element.id] ?? JSON.stringify(element.data ?? {}, null, 2);
  const data = parseObject(text);
  const {
    mutate: save,
    isPending: isSaving,
    isError: saveFailed,
  } = useUpdatePreviewFormDataMutation(org, app, sessionUrl, instanceId);

  const handleSave = (): void => {
    if (data) save({ dataElementId: element.id, data }, { onSuccess: onSaved });
  };

  return (
    <div className={classes.editor}>
      {dataElements.length > 1 && (
        <StudioSelect
          label={t('ux_editor.preview.form_data.data_model')}
          value={element.id}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedId(event.target.value)}
        >
          {dataElements.map(({ id, dataType }) => (
            <StudioSelect.Option key={id} value={id}>
              {dataType}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
      )}
      <StudioTextarea
        label={t('ux_editor.preview.form_data.data', { dataType: element.dataType })}
        className={classes.json}
        rows={16}
        spellCheck={false}
        value={text}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          setTexts({ ...texts, [element.id]: event.target.value })
        }
        error={data ? false : t('ux_editor.preview.form_data.not_an_object')}
      />
      {saveFailed && (
        <StudioValidationMessage>
          {t('ux_editor.preview.form_data.save_failed')}
        </StudioValidationMessage>
      )}
      <div className={classes.buttons}>
        <StudioButton onClick={handleSave} disabled={!data || isSaving}>
          {t('general.save')}
        </StudioButton>
        <StudioButton variant='secondary' onClick={onCancel}>
          {t('general.cancel')}
        </StudioButton>
      </div>
    </div>
  );
};

const parseObject = (text: string): object | undefined => {
  try {
    const value: unknown = JSON.parse(text);
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
};
