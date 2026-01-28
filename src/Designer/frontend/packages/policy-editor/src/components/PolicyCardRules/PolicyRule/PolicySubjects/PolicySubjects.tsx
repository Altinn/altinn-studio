import React, { useMemo } from 'react';
import {
  getAltinnSubjects,
  getCcrSubjects,
  getOtherSubjects,
  getPersonSubjects,
  getUpdatedRules,
} from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { useTranslation } from 'react-i18next';
import type { PolicyAccessPackage } from 'app-shared/types/PolicyAccessPackages';
import { hasSubject } from '@altinn/policy-editor/utils';
import { PolicySubjectsPriv } from './PolicySubjectsPriv';
import { PolicySubjectsOrg } from './PolicySubjectsOrg';
import { ErrorMessage } from '@digdir/designsystemet-react';
import { ChosenSubjects } from './ChosenSubjects/ChosenSubjects';
import type { PolicySubject } from '@altinn/policy-editor/types';

export const PolicySubjects = () => {
  const { t } = useTranslation();
  const { policyRules, subjects, accessPackages, accessPackagesPriv, setPolicyRules, savePolicy } =
    usePolicyEditorContext();
  const { policyRule, policyError, showAllErrors, setPolicyError } = usePolicyRuleContext();

  const flatAccessPackagesOrg = useMemo(() => {
    return accessPackages.flatMap((a) => a.areas).flatMap((a) => a.packages);
  }, [accessPackages]);
  const flatAccessPackagesPriv = useMemo(() => {
    return accessPackagesPriv.flatMap((a) => a.areas).flatMap((a) => a.packages);
  }, [accessPackagesPriv]);

  const [chosenOrgAccessPackages, chosenPrivAccessPackages] = useMemo(() => {
    const org: PolicyAccessPackage[] = [];
    const priv: PolicyAccessPackage[] = [];

    policyRule.accessPackages.forEach((urn) => {
      const orgPackage = flatAccessPackagesOrg.find((p) => p.urn === urn);
      const privPackage = flatAccessPackagesPriv.find((p) => p.urn === urn);

      if (orgPackage) {
        org.push(orgPackage);
      } else if (privPackage) {
        priv.push(privPackage);
      } else {
        // If urn is not found in either org or priv access packages, add unknown access package to org array
        org.push({
          id: urn,
          urn,
          name: t('policy_editor.access_package_unknown_heading'),
          description: t('policy_editor.access_package_unknown_description', {
            accessPackageUrn: urn,
          }),
          isResourcePolicyAvailable: true,
        });
      }
    });

    return [org, priv];
  }, [policyRule.accessPackages, flatAccessPackagesOrg, flatAccessPackagesPriv, t]);

  const handleRemoveSubject = (subjectUrn: string, subjectLegacyUrn?: string): void => {
    const updatedSubjects = hasSubject(policyRule.subject, subjectUrn, subjectLegacyUrn)
      ? policyRule.subject.filter((s) => s !== subjectUrn && s !== subjectLegacyUrn)
      : [...policyRule.subject, subjectLegacyUrn ?? subjectUrn]; // prefer legacyUrn over urn, until AM is updated to handle new subject urns

    const updatedRules = getUpdatedRules(
      { ...policyRule, subject: updatedSubjects },
      policyRule.ruleId,
      policyRules,
    );

    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setPolicyError({
      ...policyError,
      subjectsError: policyRule.accessPackages.length === 0 && updatedSubjects.length === 0,
    });
  };

  const handleRemoveAccessPackage = (selectedUrn: string): void => {
    // access packages can only be removed from this control
    const updateAccessPackages = policyRule.accessPackages.filter((s) => s !== selectedUrn);

    const updatedRules = getUpdatedRules(
      {
        ...policyRule,
        accessPackages: updateAccessPackages,
      },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  const getChosenAccessPackage = (heading: string, list: PolicyAccessPackage[]) => {
    return {
      heading: heading,
      handleRemove: handleRemoveAccessPackage,
      items: list.map((pkg) => {
        return {
          urn: pkg.urn,
          label: pkg.name,
        };
      }),
    };
  };

  const getChosenRoles = (heading: string, list: PolicySubject[]) => {
    const chosenRoles = list.filter(
      (x) => policyRule.subject.indexOf(x.urn) > -1 || policyRule.subject.indexOf(x.legacyUrn) > -1,
    );
    return {
      heading: heading,
      handleRemove: handleRemoveSubject,
      items: chosenRoles.map((role) => {
        return {
          urn: role.legacyUrn || role.urn,
          label: role.name,
        };
      }),
    };
  };

  const personGroups = [
    getChosenAccessPackage('Tilgangspakker', chosenPrivAccessPackages),
    getChosenRoles('Andre roller', getPersonSubjects(subjects)),
  ];

  const orgGroups = [
    getChosenAccessPackage('Tilgangspakker', chosenOrgAccessPackages),
    getChosenRoles('Andre/Altinn roller', [
      ...getAltinnSubjects(subjects),
      ...getOtherSubjects(subjects),
    ]),
    getChosenRoles('Enhetsregisterroller', getCcrSubjects(subjects)),
  ];

  return (
    <div>
      <ChosenSubjects groups={orgGroups} />
      <ChosenSubjects groups={personGroups} isPersonSubject />
      <PolicySubjectsOrg handleSubjectChange={handleRemoveSubject} />
      <PolicySubjectsPriv handleSubjectChange={handleRemoveSubject} />
      {showAllErrors && policyError.subjectsError && (
        <ErrorMessage size='small'>{t('policy_editor.rule_card_subjects_error')}</ErrorMessage>
      )}
    </div>
  );
};
