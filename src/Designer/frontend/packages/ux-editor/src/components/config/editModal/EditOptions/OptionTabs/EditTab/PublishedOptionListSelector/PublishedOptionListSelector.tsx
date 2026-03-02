import React, { useCallback } from 'react';
import {
  StudioAlert,
  StudioButton,
  StudioDialog,
  StudioError,
  StudioFieldset,
  StudioRadio,
  StudioRadioGroup,
  StudioSelect,
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
import { usePublishedResourcesQuery } from 'app-shared/hooks/queries/usePublishedResourcesQuery';
import { PUBLISHED_CODE_LIST_FOLDER } from 'app-shared/constants';
import { Guard } from '@studio/guard';
import classes from './PublishedOptionListSelector.module.css';
import { PublishedElements } from '@studio/pure-functions';

export type PublishedOptionListSelectorProps = {
  readonly component: FormItem<SelectionComponentType>;
  readonly handleComponentChange: (component: FormItem<SelectionComponentType>) => void;
  readonly orgName: string;
  readonly triggerProps: React.ComponentProps<typeof StudioDialog.Trigger>;
};

export function PublishedOptionListSelector({
  triggerProps,
  ...rest
}: PublishedOptionListSelectorProps): React.ReactNode {
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);

  const closeDialog = React.useCallback(() => {
    dialogRef.current?.close();
  }, [dialogRef]);

  if (!useFeatureFlag(FeatureFlag.NewCodeLists)) return null;

  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger variant='secondary' {...triggerProps} />
      <StudioDialog ref={dialogRef}>
        <DialogContent closeDialog={closeDialog} {...rest} />
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
}

type DialogProps = Omit<PublishedOptionListSelectorProps, 'triggerProps'> & {
  readonly closeDialog: () => void;
};

function DialogContent({ orgName, ...rest }: DialogProps): React.ReactNode {
  const { t } = useTranslation();

  const { data, status } = usePublishedResourcesQuery(orgName, PUBLISHED_CODE_LIST_FOLDER);

  switch (status) {
    case 'error':
      return <StudioError>{t('ux_editor.options.published_code_list.loading_error')}</StudioError>;
    case 'success':
      Guard.againstUndefined(data);
      return (
        <DialogContentWithData orgName={orgName} publishedCodeListFileNames={data} {...rest} />
      );
    default:
      return null; // No need to display any "pending" state since the data is probably already loaded when the user opens the dialog
  }
}

type DialogContentWithDataProps = DialogProps & {
  readonly publishedCodeListFileNames: string[];
};

function DialogContentWithData({
  publishedCodeListFileNames,
  ...rest
}: DialogContentWithDataProps): React.ReactElement {
  const publishedCodeLists = React.useMemo(
    () => new PublishedElements(publishedCodeListFileNames),
    [publishedCodeListFileNames],
  );
  if (publishedCodeLists.hasAtLeastOneElement()) {
    return <Form {...rest} publishedCodeLists={publishedCodeLists} />;
  } else return <NoCodeListsAlert closeDialog={rest.closeDialog} />;
}

type NoCodeListsAlertProps = Pick<DialogContentWithDataProps, 'closeDialog'>;

function NoCodeListsAlert({ closeDialog }: NoCodeListsAlertProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.noCodeListInfo}>
      <StudioAlert data-color='info'>
        {t('ux_editor.options.published_code_list.no_lists')}
      </StudioAlert>
      <StudioButton onClick={closeDialog}>{t('general.ok')}</StudioButton>
    </div>
  );
}

type FormProps = DialogProps & {
  readonly publishedCodeLists: PublishedElements;
};

function Form({
  closeDialog,
  component,
  handleComponentChange,
  orgName,
  publishedCodeLists,
}: FormProps) {
  const { t } = useTranslation();

  const formRef = React.useRef<HTMLFormElement | null>(null);

  const initialName = extractPublishedCodeListNameFromComponent(component);
  const initialVersion = extractPublishedCodeListVersionFromComponent(component);
  const [codeListName, setCodeListName] = React.useState<string>(initialName);
  const [version, setVersion] = React.useState<string>(initialVersion);

  const handleNameChange = useCallback((name: string) => {
    setCodeListName(name);
    setVersion(latestVersionString);
  }, []);

  const handleSaveButtonClick: React.MouseEventHandler<HTMLButtonElement> =
    React.useCallback(() => {
      if (!formRef.current?.reportValidity()) return;
      const newValues: PublishedCodeListReferenceValues = { orgName, codeListName, version };
      const updatedComponent = updatePublishedCodeListReferenceInComponent(component, newValues);
      handleComponentChange(updatedComponent);
      closeDialog();
    }, [closeDialog, component, codeListName, handleComponentChange, version, orgName]);

  return (
    <form ref={formRef}>
      <StudioFieldset legend={t('ux_editor.options.published_code_list.choose')}>
        <NamePicker
          name={codeListName}
          nameList={publishedCodeLists.retrieveElementNames()}
          onNameChange={handleNameChange}
        />
        <VersionPicker
          latestVersion={publishedCodeLists.latestVersionOrNull(codeListName)}
          onVersionChange={setVersion}
          version={version}
        />
        <StudioButton
          onClick={handleSaveButtonClick}
          icon={<FloppydiskIcon />}
          data-color='success'
        >
          {t('general.save')}
        </StudioButton>
      </StudioFieldset>
    </form>
  );
}

type NamePickerProps = {
  readonly name: string;
  readonly nameList: string[];
  readonly onNameChange: (name: string) => void;
};

function NamePicker({ name, nameList, onNameChange }: NamePickerProps) {
  const { t } = useTranslation();

  const handleNameChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
    ({ target }) => onNameChange(target.value),
    [onNameChange],
  );

  return (
    <StudioSelect
      label={t('ux_editor.options.published_code_list.name')}
      onChange={handleNameChange}
      required
      value={name}
    >
      <StudioSelect.Option key='' value=''>
        {t('ux_editor.options.published_code_list.name_placeholder')}
      </StudioSelect.Option>
      {nameList.map((codeListName) => (
        <StudioSelect.Option key={codeListName} value={codeListName}>
          {codeListName}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
}

type VersionPickerProps = {
  readonly version: string;
  readonly onVersionChange: (version: string) => void;
  readonly latestVersion: number | null;
};

function VersionPicker({
  version,
  onVersionChange,
  latestVersion,
}: VersionPickerProps): React.ReactElement {
  const { t } = useTranslation();

  const isLatest = version === latestVersionString;
  const latestVersionAsString = latestVersion === null ? '' : latestVersion.toString();
  const versionNumber = isLatest ? latestVersionAsString : version;

  const handleSetLatestVersion = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    () => onVersionChange(latestVersionString),
    [onVersionChange],
  );

  const handleSetFixedVersion = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    () => onVersionChange(versionNumber),
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
          onChange={handleSetLatestVersion}
        />
        <StudioRadio
          checked={!isLatest}
          label={t('ux_editor.options.published_code_list.fixed_version')}
          name={versionRadioName}
          onChange={handleSetFixedVersion}
        />
      </StudioRadioGroup>
      <StudioTextfield
        disabled={isLatest}
        label={t('ux_editor.options.published_code_list.version')}
        max={latestVersion}
        min={1}
        onChange={handleVersionNumberChange}
        required={!isLatest}
        type='number'
        value={versionNumber}
      />
    </>
  );
}

const versionRadioName = 'version';
