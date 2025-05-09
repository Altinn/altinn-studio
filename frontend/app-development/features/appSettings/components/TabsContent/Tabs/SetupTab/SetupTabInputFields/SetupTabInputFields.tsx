import React from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './SetupTabInputFields.module.css';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';

export type SetupTabInputFieldsProps = {
  appMetadata: ApplicationMetadata;
};

export function SetupTabInputFields({ appMetadata }: SetupTabInputFieldsProps): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  return <>todo</>;
}
