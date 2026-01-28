import React, { useMemo } from 'react';
import {
  StudioAlert,
  StudioDetails,
  StudioHeading,
  StudioParagraph,
  StudioTabs,
} from '@studio/components';
import { getPersonSubjects } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicySubjects.module.css';
import { PersonIcon } from '@studio/icons';
import { PolicyAccessPackages } from '../PolicyAccessPackages';
import { useTranslation } from 'react-i18next';
import { RoleList } from './RoleList/RoleList';

enum TabId {
  AccessPackages = 'AccessPackages',
  Guardian = 'Guardian',
  Other = 'Other',
}

interface PolicySubjectsPrivProps {
  handleSubjectChange: (subjectUrn: string, subjectLegacyUrn?: string) => void;
}

export const PolicySubjectsPriv = ({ handleSubjectChange }: PolicySubjectsPrivProps) => {
  const { t } = useTranslation();
  const { subjects, accessPackagesPriv } = usePolicyEditorContext();
  const { policyRule } = usePolicyRuleContext();

  const personSubjects = useMemo(() => {
    return getPersonSubjects(subjects);
  }, [subjects]);

  return (
    <StudioDetails data-color='neutral'>
      <StudioDetails.Summary className={classes.personAccordion}>
        <PersonIcon fontSize={28} /> For privatperson
      </StudioDetails.Summary>
      <StudioDetails.Content className={classes.subjectBlock}>
        <StudioTabs defaultValue={TabId.AccessPackages}>
          <StudioTabs.List>
            <StudioTabs.Tab value={TabId.AccessPackages}>
              {t('policy_editor.rule_card_subjects_access_packages')}
            </StudioTabs.Tab>
            <StudioTabs.Tab value={TabId.Guardian}>Vergemål</StudioTabs.Tab>
            <StudioTabs.Tab value={TabId.Other}>
              {t('policy_editor.rule_card_subjects_other_roles')}
            </StudioTabs.Tab>
          </StudioTabs.List>
          <StudioTabs.Panel value={TabId.AccessPackages}>
            <PolicyAccessPackages accessPackages={accessPackagesPriv} isPersonSubject />
          </StudioTabs.Panel>
          <StudioTabs.Panel value={TabId.Guardian}>
            <StudioAlert data-color='info'>
              <StudioHeading level={3}>Snart kommer vergeroller i Altinn</StudioHeading>
              <StudioParagraph>
                Vergerollene vil fungere tilsvarende roller fra Enhetsregisteret og tildeles av
                Statsforvalteren. Rollene vil vises i Altinn, men kan ikke tilgangsstyres. Bruk
                rollene for å gi verger tilgang til deres tjenester i kraft av rollen som verge.
              </StudioParagraph>
              <StudioParagraph>
                Mer om vergerollene: https://www.vergemal.no/fullmaktstekst
              </StudioParagraph>
            </StudioAlert>
          </StudioTabs.Panel>
          <StudioTabs.Panel value={TabId.Other}>
            <RoleList
              selectedSubjects={policyRule.subject}
              subjects={personSubjects}
              isPersonSubject
              heading={t('policy_editor.rule_card_subjects_other_roles')}
              handleChange={handleSubjectChange}
            />
          </StudioTabs.Panel>
        </StudioTabs>
      </StudioDetails.Content>
    </StudioDetails>
  );
};
