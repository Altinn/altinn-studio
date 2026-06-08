import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StudioAlert } from '@studio/components';
import classes from './Altinn2RoleWarning.module.css';

interface Altinn2RoleWarningProps {
  itemType: string;
  deprecatedAltinn2Roles: { urn: string; name: string }[];
}

export const Altinn2RoleWarning = ({
  itemType,
  deprecatedAltinn2Roles,
}: Altinn2RoleWarningProps): React.JSX.Element => {
  const { t } = useTranslation();

  // Deduplicate roles by urn
  const uniqueDeprecatedRoles = Array.from(
    new Map(deprecatedAltinn2Roles.map((role) => [role.urn, role])).values(),
  );

  return (
    <StudioAlert data-color='warning' className={classes.altinn2RoleWarning}>
      <div className={classes.altinn2RoleWarningHeading}>{t('altinn2_role_warning.heading')}</div>
      <Trans
        i18nKey='altinn2_role_warning.body'
        values={{ itemType: itemType }}
        components={{
          ul: (
            <ul>
              {uniqueDeprecatedRoles.map((role) => (
                <li key={role.urn}>{role.name}</li>
              ))}
            </ul>
          ),
        }}
      />
      <div>{t('altinn2_role_warning.footer')}</div>
    </StudioAlert>
  );
};
