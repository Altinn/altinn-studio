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
import { PolicySubjectsPerson } from './PolicySubjectsPerson';
import { PolicySubjectsOrg } from './PolicySubjectsOrg';
import { ErrorMessage } from '@digdir/designsystemet-react';
import { ChosenSubjects } from './ChosenSubjects';
import type { PolicySubject } from '@altinn/policy-editor/types';
import classes from './PolicySubjects.module.css';
import {
  GUARDIANSHIP_ACCESS_PACKAGE_GROUP_ID,
  PERSON_ACCESS_PACKAGE_GROUP_ID,
} from '@altinn/policy-editor/constants';

export const PolicySubjects = () => {
  const { t } = useTranslation();
  const { policyRules, subjects, accessPackages, setPolicyRules, savePolicy } =
    usePolicyEditorContext();
  const { policyRule, policyError, showAllErrors, setPolicyError } = usePolicyRuleContext();

  // map access packages
  const {
    orgPackageHierarchy,
    orgPackageList,
    personPackageHierarchy,
    personPackageList,
    guardianshipPackageHierarchy,
    guardianshipPackageList,
  } = useMemo(() => {
    const orgHierarchy = accessPackages.filter(
      (group) =>
        group.id !== PERSON_ACCESS_PACKAGE_GROUP_ID &&
        group.id !== GUARDIANSHIP_ACCESS_PACKAGE_GROUP_ID,
    );
    const orgList = orgHierarchy.flatMap((a) => a.areas).flatMap((a) => a.packages);

    const personHierarchy = accessPackages.filter(
      (group) => group.id === PERSON_ACCESS_PACKAGE_GROUP_ID,
    );
    const personList = personHierarchy.flatMap((a) => a.areas).flatMap((a) => a.packages);

    const guardianshipHierarchy = accessPackages.filter(
      (group) => group.id === GUARDIANSHIP_ACCESS_PACKAGE_GROUP_ID,
    );
    const guardianshipList = guardianshipHierarchy
      .flatMap((a) => a.areas)
      .flatMap((a) => a.packages);

    return {
      orgPackageHierarchy: orgHierarchy,
      orgPackageList: orgList,
      personPackageHierarchy: personHierarchy,
      personPackageList: personList,
      guardianshipPackageHierarchy: guardianshipHierarchy,
      guardianshipPackageList: guardianshipList,
    };
  }, [accessPackages]);

  // map roles/other subjects
  const { personSubjects, altinnSubjects, otherSubjects, ccrSubjects } = useMemo(() => {
    return {
      personSubjects: getPersonSubjects(subjects),
      altinnSubjects: getAltinnSubjects(subjects),
      otherSubjects: getOtherSubjects(subjects),
      ccrSubjects: getCcrSubjects(subjects),
    };
  }, [subjects]);

  // map chosen access packages
  const { chosenOrgAccessPackages, chosenPersonAccessPackages, chosenGuardianshipAccessPackages } =
    useMemo(() => {
      const orgPackages: PolicyAccessPackage[] = [];
      const personPackages: PolicyAccessPackage[] = [];
      const guardianshipPackages: PolicyAccessPackage[] = [];

      policyRule.accessPackages.forEach((urn) => {
        const orgPackage = orgPackageList.find((p) => p.urn.toLowerCase() === urn.toLowerCase());
        const personPackage = personPackageList.find(
          (p) => p.urn.toLowerCase() === urn.toLowerCase(),
        );
        const guardianshipPackage = guardianshipPackageList.find(
          (p) => p.urn.toLowerCase() === urn.toLowerCase(),
        );

        if (orgPackage) {
          orgPackages.push(orgPackage);
        } else if (personPackage) {
          personPackages.push(personPackage);
        } else if (guardianshipPackage) {
          guardianshipPackages.push(guardianshipPackage);
        } else {
          // If urn is not found in either org or priv access packages, add unknown access package to org array
          orgPackages.push({
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

      return {
        chosenOrgAccessPackages: orgPackages,
        chosenPersonAccessPackages: personPackages,
        chosenGuardianshipAccessPackages: guardianshipPackages,
      };
    }, [policyRule.accessPackages, orgPackageList, personPackageList, guardianshipPackageList, t]);

  // map chosen roles
  const { chosenPersonRoles, chosenAltinnRoles, chosenCcrRoles } = useMemo(() => {
    const filterSelectedRoles = (list: PolicySubject[]) => {
      const lowerCaseSubjects = policyRule.subject.map((x) => x.toLowerCase());
      return list.filter(
        (x) =>
          lowerCaseSubjects.indexOf(x.urn?.toLowerCase()) > -1 ||
          lowerCaseSubjects.indexOf(x.legacyUrn?.toLowerCase()) > -1,
      );
    };

    return {
      chosenPersonRoles: filterSelectedRoles(personSubjects),
      chosenAltinnRoles: filterSelectedRoles([...altinnSubjects, ...otherSubjects]),
      chosenCcrRoles: filterSelectedRoles(ccrSubjects),
    };
  }, [policyRule.subject, personSubjects, altinnSubjects, otherSubjects, ccrSubjects]);

  const handleChangeSubject = (subjectUrn: string, subjectLegacyUrn?: string): void => {
    const updatedSubjects = hasSubject(policyRule.subject, subjectUrn, subjectLegacyUrn)
      ? policyRule.subject.filter(
          (s) =>
            s.toLowerCase() !== subjectUrn?.toLowerCase() &&
            s.toLowerCase() !== subjectLegacyUrn?.toLowerCase(),
        )
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
      subjectsError: updatedSubjects.length === 0 && policyRule.accessPackages.length === 0,
    });
  };

  const handleRemoveAccessPackage = (selectedUrn: string): void => {
    // access packages can only be removed from this control
    const updateAccessPackages = policyRule.accessPackages.filter(
      (s) => s.toLowerCase() !== selectedUrn.toLowerCase(),
    );

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
    setPolicyError({
      ...policyError,
      subjectsError: updateAccessPackages.length === 0 && policyRule.subject.length === 0,
    });
  };

  const getChosenAccessPackages = (heading: string, list: PolicyAccessPackage[]) => {
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
    return {
      heading: heading,
      handleRemove: handleChangeSubject,
      items: list.map((role) => {
        return {
          urn: role.legacyUrn || role.urn,
          label: role.name,
        };
      }),
    };
  };

  const chosenPersonGroups = [
    getChosenAccessPackages(t('policy_editor.access_package_header'), chosenPersonAccessPackages),
    getChosenAccessPackages(
      t('policy_editor.rule_card_subjects_guardianships'),
      chosenGuardianshipAccessPackages,
    ),
    getChosenRoles(t('policy_editor.rule_card_subjects_other_roles'), chosenPersonRoles),
  ];

  const chosenOrgGroups = [
    getChosenAccessPackages(t('policy_editor.access_package_header'), chosenOrgAccessPackages),
    getChosenRoles(t('policy_editor.rule_card_subjects_other_altinn_roles'), chosenAltinnRoles),
    getChosenRoles(t('policy_editor.rule_card_subjects_ccr_roles'), chosenCcrRoles),
  ];

  return (
    <div>
      <div className={classes.subjectHeader}>{t('policy_editor.rule_card_subjects_title')}</div>
      <div data-color='neutral' className={classes.subjectDescription}>
        {t('policy_editor.rule_card_subjects_subtitle')}
      </div>
      <ChosenSubjects groups={chosenOrgGroups} />
      <ChosenSubjects groups={chosenPersonGroups} isPersonSubject />
      <PolicySubjectsOrg
        accessPackages={orgPackageHierarchy}
        ccrSubjects={ccrSubjects}
        altinnSubjects={altinnSubjects}
        otherSubjects={otherSubjects}
        handleSubjectChange={handleChangeSubject}
      />
      <PolicySubjectsPerson
        personAccessPackages={personPackageHierarchy}
        guardianshipAccessPackages={guardianshipPackageHierarchy}
        personSubjects={personSubjects}
        handleSubjectChange={handleChangeSubject}
      />
      {showAllErrors && policyError.subjectsError && (
        <ErrorMessage size='small'>{t('policy_editor.rule_card_subjects_error')}</ErrorMessage>
      )}
    </div>
  );
};
