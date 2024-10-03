import React from 'react';
import classes from './PolicyEditorPage.module.css';
import {
  PolicyEditor,
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
} from '@altinn/policy-editor';
import type { Policy } from '@altinn/policy-editor';
import { Spinner, Heading } from '@digdir/designsystemet-react';
import { useResourcePolicyQuery } from '../../hooks/queries';
import { useEditResourcePolicyMutation } from '../../hooks/mutations';
import { useTranslation } from 'react-i18next';
import {
  useResourcePolicyActionsQuery,
  useResourcePolicySubjectsQuery,
} from 'app-shared/hooks/queries';
import { useUrlParams } from '../../hooks/useUrlParams';

export type PolicyEditorPageProps = {
  showAllErrors: boolean;
  id: string;
};

/**
 * @component
 *    Page that displays the content where a user can add and edit a policy
 *
 * @property {boolean}[showAllErrors] - Flag to decide if all errors should be shown or not
 * @property {string}[id] - The id of the page
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const PolicyEditorPage = ({
  showAllErrors,
  id,
}: PolicyEditorPageProps): React.JSX.Element => {
  const { t } = useTranslation();

  const { resourceId, org, app } = useUrlParams();

  // Get the data
  const { data: policyData, isPending: isPolicyPending } = useResourcePolicyQuery(
    org,
    app,
    resourceId,
  );
  const { data: actionData, isPending: isActionPending } = useResourcePolicyActionsQuery(org, app);
  const { data: subjectData, isPending: isSubjectsPending } = useResourcePolicySubjectsQuery(
    org,
    app,
  );

  // Mutation function to update policy
  const { mutate: updatePolicyMutation } = useEditResourcePolicyMutation(org, app, resourceId);

  /**
   * Saves the policy to backend
   */
  const handleSavePolicy = (policy: Policy) => {
    updatePolicyMutation(policy, {
      onSuccess: () => {
        console.log('success');
      },
    });
  };

  /**
   * Displays the content based on the state of the page
   */
  const displayContent = () => {
    if (isPolicyPending || isActionPending || isSubjectsPending) {
      return (
        <div className={classes.spinnerWrapper}>
          <Spinner
            size='xlarge'
            variant='interaction'
            title={t('resourceadm.policy_editor_spinner')}
          />
        </div>
      );
    }

    const mergedActions = mergeActionsFromPolicyWithActionOptions(policyData.rules, actionData);
    const mergedSubjects = mergeSubjectsFromPolicyWithSubjectOptions(policyData.rules, subjectData);

    return (
      <PolicyEditor
        policy={policyData}
        actions={mergedActions}
        subjects={mergedSubjects}
        accessPackages={[
          {
            id: 'category_economy',
            name: {
              nn: 'Skatt og Merverdiavgift',
              nb: 'Skatt og Merverdiavgift',
              en: 'Economy',
            },
            description: {
              nn: 'Underkatagori for tilgangspakker til tjenester som angår skatt og merverdiavgift.',
              nb: 'Underkatagori for tilgangspakker til tjenester som angår skatt og merverdiavgift.',
              en: 'Grants access to economical services',
            },
            packages: [
              {
                urn: 'urn:altinn:accesspackage:foretaksskatt',
                name: {
                  nn: 'Foretaksskatt',
                  nb: 'Foretaksskatt',
                  en: 'Foretaksskatt',
                },
                description: {
                  nn: 'Denne tilgangspakken gir fullmakter til tjenester knyttet til skatt for foretak. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                  nb: 'Denne tilgangspakken gir fullmakter til tjenester knyttet til skatt for foretak. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                  en: 'Lets you submit tax info',
                },
              },
              {
                urn: 'urn:altinn:accesspackage:skattegrunnlag',
                name: {
                  nn: 'Skattegrunnlag',
                  nb: 'Skattegrunnlag',
                  en: 'Skattegrunnlag',
                },
                description: {
                  nn: 'Denne tilgangspakken gir fullmakter til tjenester knyttet til innhenting av skattegrunnlag. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                  nb: 'Denne tilgangspakken gir fullmakter til tjenester knyttet til innhenting av skattegrunnlag. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                  en: 'Lets you submit tax info',
                },
              },
              {
                urn: 'urn:altinn:accesspackage:merverdiavgift',
                name: {
                  nn: 'Merverdiavgift',
                  nb: 'Merverdiavgift',
                  en: 'Merverdiavgift',
                },
                description: {
                  nn: 'Denne tilgangspakken gir fullmakter til tjenester knyttet til merverdiavgift. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                  nb: 'Denne tilgangspakken gir fullmakter til tjenester knyttet til merverdiavgift. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                  en: 'Lets you submit tax info',
                },
              },
            ],
          },
          {
            id: 'category_transport',
            name: {
              nn: 'Transport og lagring',
              nb: 'Transport og lagring',
              en: 'Transport',
            },
            description: {
              nn: 'Denne fullmakten gir tilgang til alle tjenester som angår transport og lagring inkludert passasjer og godstransport, samt post- og kurervirksomhet. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
              nb: 'Denne fullmakten gir tilgang til alle tjenester som angår transport og lagring inkludert passasjer og godstransport, samt post- og kurervirksomhet. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
              en: 'Grants access to economical services',
            },
            packages: [
              {
                urn: 'urn:altinn:accesspackage:sjofart',
                name: {
                  nn: 'Sjøfart',
                  nb: 'Sjøfart',
                  en: 'Sjøfart',
                },
                description: {
                  nn: 'Denne fullmakten gir tilgang til alle tjenester knyttet til skipsarbeidstakere og fartøy til sjøs. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                  nb: 'Denne fullmakten gir tilgang til alle tjenester knyttet til skipsarbeidstakere og fartøy til sjøs. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                  en: 'Denne fullmakten gir tilgang til alle tjenester knyttet til skipsarbeidstakere og fartøy til sjøs. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                },
              },
              {
                urn: 'urn:altinn:accesspackage:lufttransport',
                name: {
                  nn: 'Lufttransport',
                  nb: 'Lufttransport',
                  en: 'Lufttransport',
                },
                description: {
                  nn: 'Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                  nb: 'Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                  en: 'Denne fullmakten gir tilgang til alle tjenester knyttet til luftfartøy og romfartøy. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som fullmakten gir.',
                },
              },
            ],
          },
        ]}
        resourceId={resourceId}
        onSave={handleSavePolicy}
        showAllErrors={showAllErrors}
        usageType='resource'
      />
    );
  };

  return (
    <div className={classes.policyEditorWrapper} id={id} role='tabpanel'>
      <Heading size='large' spacing level={1}>
        {t('resourceadm.policy_editor_title')}
      </Heading>
      {displayContent()}
    </div>
  );
};
