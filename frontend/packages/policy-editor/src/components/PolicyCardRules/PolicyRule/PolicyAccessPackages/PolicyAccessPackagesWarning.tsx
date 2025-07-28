import React, { type ReactElement } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioLabelAsParagraph,
  StudioLink,
  StudioList,
} from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './PolicyAccessPackagesWarning.module.css';

export const PolicyAccessPackagesWarning = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioAlert severity='warning' size='sm'>
      <StudioLabelAsParagraph size='md' spacing>
        {t('policy_editor.access_package_warning_header')}
      </StudioLabelAsParagraph>
      <StudioParagraph className={classes.warningElements}>
        <Trans i18nKey='policy_editor.access_package_warning_body1'>
          <StudioLink
            href={altinnDocsUrl({
              relativeUrl: 'authorization/what-do-you-get/accessgroups/',
            })}
            target='_newTab'
            rel='noopener noreferrer'
          >
            {''}
          </StudioLink>
        </Trans>
      </StudioParagraph>
      <StudioParagraph className={classes.warningElements}>
        {t('policy_editor.access_package_warning_body2')}
      </StudioParagraph>
      <StudioLabelAsParagraph size='sm'>
        {t('policy_editor.access_package_warning_header2')}
      </StudioLabelAsParagraph>
      <StudioList.Root size='sm'>
        <StudioList.Unordered>
          <StudioList.Item>{t('policy_editor.access_package_warning_listitem1')}</StudioList.Item>
          <StudioList.Item>{t('policy_editor.access_package_warning_listitem2')}</StudioList.Item>
          <StudioList.Item>{t('policy_editor.access_package_warning_listitem3')}</StudioList.Item>
        </StudioList.Unordered>
      </StudioList.Root>
    </StudioAlert>
  );
};
