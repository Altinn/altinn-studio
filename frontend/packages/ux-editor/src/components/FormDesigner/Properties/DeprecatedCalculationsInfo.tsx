import React from 'react';
import { ExternalLinkIcon } from '@studio/icons';
import { StudioAlert, StudioHeading, StudioLink, StudioParagraph } from '@studio/components-legacy';
import { useAppContext } from '../../../hooks';
import classes from './Calculations.module.css';
import { altinnDocsUrl, giteaEditLink } from 'app-shared/ext-urls';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';

export const DeprecatedCalculationsInfo = () => {
  const { t } = useTranslation();
  const { app, org } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const calculationsLocation = `App/ui/${selectedFormLayoutSetName}/RuleHandler.js`;

  return (
    <div className={classes.calculations}>
      <StudioAlert size='sm'>
        <StudioHeading size='2xs'>
          {t('right_menu.rules_calculations_deprecated_info_title')}
        </StudioHeading>
        <StudioParagraph size='sm'>
          {t('right_menu.rules_calculations_deprecated_info')}
        </StudioParagraph>
        <StudioLink
          href={altinnDocsUrl({ relativeUrl: 'altinn-studio/reference/logic/dynamic/' })}
          rel='noopener noreferrer'
          target='_blank'
        >
          {t('right_menu.dynamics_link')}
        </StudioLink>
      </StudioAlert>
      <div>
        <StudioLink
          href={giteaEditLink(org, app, calculationsLocation)}
          target='_blank'
          rel='noreferrer'
        >
          {t('right_menu.rules_calculations_edit_in_gitea')}
          <ExternalLinkIcon />
        </StudioLink>
      </div>
    </div>
  );
};
