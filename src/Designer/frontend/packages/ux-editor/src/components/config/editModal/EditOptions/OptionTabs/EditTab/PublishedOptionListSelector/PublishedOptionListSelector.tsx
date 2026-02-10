import React from 'react';
import { StudioButton, StudioDialog, StudioFieldset, StudioTextfield } from '@studio/components';
import { FloppydiskIcon } from '@studio/icons';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import type { FormItem } from '../../../../../../../types/FormItem';
import {
  extractPublishedCodeListNameFromComponent,
  extractPublishedCodeListVersionFromComponent,
  updatePublishedCodeListReferenceInComponent,
} from './utils';
import type { PublishedCodeListReferenceValues } from '../../types/PublishedCodeListReferenceValues';
import { useTranslation } from 'react-i18next';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';

export type PublishedOptionListSelectorProps = {
  readonly component: FormItem<SelectionComponentType>;
  readonly handleComponentChange: (component: FormItem<SelectionComponentType>) => void;
  readonly orgName: string;
};

export function PublishedOptionListSelector({
  component,
  handleComponentChange,
  orgName,
}: PublishedOptionListSelectorProps): React.ReactNode {
  const { t } = useTranslation();

  const dialogRef = React.useRef<HTMLDialogElement | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const initialName = extractPublishedCodeListNameFromComponent(component);
  const initialVersion = extractPublishedCodeListVersionFromComponent(component);
  const [codeListName, setCodeListName] = React.useState<string>(initialName);
  const [version, setVersion] = React.useState<string>(initialVersion);

  const closeDialog = React.useCallback(() => {
    dialogRef.current?.close();
  }, [dialogRef]);

  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (event) => setCodeListName(event.target.value),
    [],
  );

  const handleVersionChange: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (event) => setVersion(event.target.value),
    [],
  );

  const handleSaveButtonClick: React.MouseEventHandler<HTMLButtonElement> =
    React.useCallback(() => {
      const newValues: PublishedCodeListReferenceValues = { orgName, codeListName, version };
      const updatedComponent = updatePublishedCodeListReferenceInComponent(component, newValues);
      handleComponentChange(updatedComponent);
      closeDialog();
    }, [closeDialog, component, codeListName, handleComponentChange, version, orgName]);

  if (!useFeatureFlag(FeatureFlag.NewCodeLists)) return null;

  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger variant='secondary'>
        {t('ux_editor.options.published_code_list.choose')}
      </StudioDialog.Trigger>
      <StudioDialog ref={dialogRef}>
        <form ref={formRef}>
          <StudioFieldset legend={t('ux_editor.options.published_code_list.choose')}>
            <StudioTextfield
              label={t('ux_editor.options.published_code_list.name')}
              onChange={handleNameChange}
              required
              value={codeListName}
            />
            <StudioTextfield
              label={t('ux_editor.options.published_code_list.version')}
              onChange={handleVersionChange}
              pattern='\d+|_latest'
              required
              value={version}
            />
            <StudioButton
              onClick={handleSaveButtonClick}
              icon={<FloppydiskIcon />}
              data-color='success'
              disabled={!formRef.current?.checkValidity()}
            >
              {t('general.save')}
            </StudioButton>
          </StudioFieldset>
        </form>
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
}
