import { useRef, useState } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { PolicyEditor } from '@altinn/policy-editor';
import type { Policy } from '@altinn/policy-editor';
import { StudioAlert, StudioButton, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import { HttpResponseUtils } from 'app-shared/utils/httpResponseUtils';
import classes from './VersionedPolicyEditor.module.css';

type VersionedPolicyEditorProps = Omit<ComponentProps<typeof PolicyEditor>, 'onSave'> & {
  onSave: (policy: Policy) => Promise<Policy>;
  onReload: () => Promise<Policy>;
};

type SaveFailure = 'conflict' | 'error';

const failureMessageKeys: Record<SaveFailure, string> = {
  conflict: 'app_settings.policy_save_conflict',
  error: 'app_settings.policy_save_failed',
};

export function VersionedPolicyEditor({
  policy,
  onSave,
  onReload,
  ...props
}: VersionedPolicyEditorProps): ReactElement {
  const { t } = useTranslation();
  // A background refetch must not attach a new revision to the editor's existing draft.
  const [snapshot, setSnapshot] = useState(policy);
  const [editorKey, setEditorKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const busy = useRef(false);

  const save = async (draft: Policy): Promise<void> => {
    if (busy.current || failure) return;
    busy.current = true;
    setSaving(true);
    try {
      setSnapshot(await onSave({ ...draft, revision: snapshot.revision }));
    } catch (error) {
      setFailure(
        HttpResponseUtils.isPreconditionFailed(error as AxiosError) ? 'conflict' : 'error',
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const reload = async (): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      setSnapshot(await onReload());
      setEditorKey((key) => key + 1);
      setFailure(null);
    } catch {
      // The alert stays, so the user can try again.
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      {failure && (
        <StudioAlert data-color='danger' role='alert'>
          <StudioParagraph>{t(failureMessageKeys[failure])}</StudioParagraph>
          <StudioButton onClick={() => void reload()} disabled={saving} variant='secondary'>
            {t('app_settings.policy_reload')}
          </StudioButton>
        </StudioAlert>
      )}
      <fieldset className={classes.editor} disabled={saving || failure !== null} aria-busy={saving}>
        <PolicyEditor key={editorKey} {...props} policy={snapshot} onSave={save} />
      </fieldset>
    </>
  );
}
