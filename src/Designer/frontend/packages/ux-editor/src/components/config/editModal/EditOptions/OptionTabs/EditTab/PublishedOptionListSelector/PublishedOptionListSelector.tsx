import React from 'react';
import {
  StudioButton,
  StudioDialog,
  StudioFieldset,
  StudioRadio,
  StudioRadioGroup,
  StudioTextfield,
} from '@studio/components';
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
import { latestVersionString } from '../../utils/published-code-list-reference-utils';

export type PublishedOptionListSelectorProps = {
  readonly component: FormItem<SelectionComponentType>;
  readonly handleComponentChange: (component: FormItem<SelectionComponentType>) => void;
  readonly orgName: string;
  readonly triggerProps: React.ComponentProps<typeof StudioDialog.Trigger>;
};

export function PublishedOptionListSelector({
  component,
  handleComponentChange,
  orgName,
  triggerProps,
}: PublishedOptionListSelectorProps): React.ReactNode {
  const { t } = useTranslation();

  const dialogRef = React.useRef<HTMLDialogElement | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const initialName = extractPublishedCodeListNameFromComponent(component);
  const initialVersion = extractPublishedCodeListVersionFromComponent(component);
  const [codeListName, setCodeListName] = React.useState<string>(initialName);
  const [version, setVersion] = React.useState<string>(initialVersion);

  const [isFormValid, setIsFormValid] = React.useState<boolean>(false);
  React.useLayoutEffect(() => {
    setIsFormValid(formRef.current?.checkValidity() ?? false);
  }, [codeListName, version, formRef]);

  const closeDialog = React.useCallback(() => {
    dialogRef.current?.close();
  }, [dialogRef]);

  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (event) => setCodeListName(event.target.value),
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
      <StudioDialog.Trigger variant='secondary' {...triggerProps} />
      <StudioDialog ref={dialogRef}>
        <form ref={formRef}>
          <StudioFieldset legend={t('ux_editor.options.published_code_list.choose')}>
            <StudioTextfield
              label={t('ux_editor.options.published_code_list.name')}
              onChange={handleNameChange}
              required
              value={codeListName}
            />
            <VersionPicker version={version} onVersionChange={setVersion} />
            <StudioButton
              onClick={handleSaveButtonClick}
              icon={<FloppydiskIcon />}
              data-color='success'
              disabled={!isFormValid}
            >
              {t('general.save')}
            </StudioButton>
          </StudioFieldset>
        </form>
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
}

type VersionPickerProps = {
  readonly version: string;
  readonly onVersionChange: (version: string) => void;
};

function VersionPicker({ version, onVersionChange }: VersionPickerProps): React.ReactElement {
  const { t } = useTranslation();

  const isLatest = version === latestVersionString;
  const versionNumber = isLatest ? '' : version;

  const handleLatestToggle = React.useCallback(
    (shouldReferToLatest: boolean): void => {
      onVersionChange(shouldReferToLatest ? latestVersionString : versionNumber);
    },
    [versionNumber, onVersionChange],
  );

  const handleVersionNumberChange = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      const newVersion = event.target.value;
      onVersionChange(newVersion);
    },
    [onVersionChange],
  );

  return (
    <>
      <StudioRadioGroup
        legend={t('ux_editor.options.published_code_list.latest_or_fixed_legend')}
        description={t('ux_editor.options.published_code_list.latest_or_fixed_description')}
      >
        <StudioRadio
          checked={isLatest}
          label={t('ux_editor.options.published_code_list.latest_version')}
          name={versionRadioName}
          onChange={({ target }) => handleLatestToggle(target.checked)}
        />
        <StudioRadio
          checked={!isLatest}
          label={t('ux_editor.options.published_code_list.fixed_version')}
          name={versionRadioName}
          onChange={({ target }) => handleLatestToggle(!target.checked)}
        />
      </StudioRadioGroup>
      <StudioTextfield
        disabled={isLatest}
        label={t('ux_editor.options.published_code_list.version')}
        onChange={handleVersionNumberChange}
        required={!isLatest}
        type='number'
        value={versionNumber}
      />
    </>
  );
}

const versionRadioName = 'version';
