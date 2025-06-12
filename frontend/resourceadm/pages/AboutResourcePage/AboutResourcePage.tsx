import React, { useState } from 'react';
import classes from './AboutResourcePage.module.css';
import { ErrorSummary } from '@digdir/designsystemet-react';
import { StudioHeading } from '@studio/components-legacy';
import { StudioAlert } from '@studio/components';
import type { Translation } from '../../types/Translation';
import type {
  Resource,
  ResourceTypeOption,
  ResourceStatusOption,
  ResourceAvailableForTypeOption,
  ResourceContactPoint,
  SupportedLanguage,
  ResourceReference,
  ResourceFormError,
  ConsentTemplate,
} from 'app-shared/types/ResourceAdm';
import {
  availableForTypeMap,
  resourceStatusMap,
  mapKeywordStringToKeywordTypeArray,
  mapKeywordsArrayToString,
  resourceTypeMap,
  convertMetadataStringToConsentMetadata,
} from '../../utils/resourceUtils';
import { useTranslation } from 'react-i18next';
import {
  ResourceCheckboxGroup,
  ResourceLanguageTextField,
  ResourceSwitchInput,
  ResourceTextField,
  ResourceRadioGroup,
} from '../../components/ResourcePageInputs';
import { ResourceContactPointFields } from '../../components/ResourceContactPointFields';
import { ResourceReferenceFields } from '../../components/ResourceReferenceFields';
import { AccessListEnvLinks } from '../../components/AccessListEnvLinks';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

export type AboutResourcePageProps = {
  resourceData: Resource;
  validationErrors: ResourceFormError[];
  consentTemplates?: ConsentTemplate[];
  onSaveResource: (r: Resource) => void;
  id: string;
};

/**
 * @component
 *    Page that displays information about a resource
 *
 * @property {Resource}[resourceData] - The metadata for the resource
 * @property {function}[onSaveResource] - Function to be handled when saving the resource
 * @property {string}[id] - The id of the page
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const AboutResourcePage = ({
  resourceData,
  validationErrors,
  consentTemplates,
  onSaveResource,
  id,
}: AboutResourcePageProps): React.JSX.Element => {
  const { t } = useTranslation();

  /**
   * Resource type options
   */
  const resourceTypeOptions = Object.entries(resourceTypeMap)
    .filter(([key]) =>
      key === 'Consent' ? shouldDisplayFeature(FeatureFlag.ConsentResource) : true,
    )
    .map(([key, value]) => ({
      value: key,
      label: t(value),
    }));

  /**
   * Status options
   */
  const statusOptions = Object.keys(resourceStatusMap).map((key) => ({
    value: key,
    label: t(resourceStatusMap[key]),
  }));

  /**
   * Available for options
   */
  const availableForOptions = Object.keys(availableForTypeMap).map((key) => ({
    value: key,
    label: t(availableForTypeMap[key]),
  }));

  const consentTemplateOptions = (consentTemplates ?? []).map((template) => ({
    value: template.id,
    label: template.title,
  }));

  // To handle which translation value is shown in the right menu
  const [translationType, setTranslationType] = useState<Translation>('none');

  /**
   * Saves the resource object passed in
   *
   * @param res the resource to save
   */
  const handleSave = (res: Resource) => {
    onSaveResource(res);
  };

  /**
   * Displays the content on the page
   */
  const displayContent = () => {
    return (
      <div className={classes.resourceFields}>
        <StudioHeading size='lg' level={1}>
          {t('resourceadm.about_resource_title')}
        </StudioHeading>
        {validationErrors.length > 0 && (
          <ErrorSummary.Root>
            <ErrorSummary.Heading>
              {t('resourceadm.about_resource_error_summary_header')}
            </ErrorSummary.Heading>
            <ErrorSummary.List>
              {validationErrors.map((error) => {
                const href = `#${error.field}${error.index !== undefined && typeof error.index === 'number' ? `-${error.index}` : ''}`;
                return (
                  <ErrorSummary.Item key={JSON.stringify(error)} href={href}>
                    {error.error}
                  </ErrorSummary.Item>
                );
              })}
            </ErrorSummary.List>
          </ErrorSummary.Root>
        )}
        <ResourceTextField
          id='identifier'
          label={t('resourceadm.about_resource_identifier_label')}
          description={t('resourceadm.about_resource_identifier_description')}
          value={resourceData.identifier}
          readOnly
          onFocus={() => setTranslationType('none')}
          onBlur={() => {}}
        />
        <ResourceRadioGroup
          id='resourceType'
          label={t('resourceadm.about_resource_resource_type')}
          description={t('resourceadm.about_resource_resource_type_label')}
          value={resourceData.resourceType}
          options={resourceTypeOptions}
          onFocus={() => setTranslationType('none')}
          onChange={(selected: ResourceTypeOption) =>
            handleSave({ ...resourceData, resourceType: selected })
          }
          required
          errors={validationErrors.filter((error) => error.field === 'resourceType')}
        />
        <ResourceLanguageTextField
          id='title'
          label={t('resourceadm.about_resource_resource_title_label')}
          description={t('resourceadm.about_resource_resource_title_text')}
          translationDescription={t('resourceadm.about_resource_translation_title')}
          value={resourceData.title}
          onFocus={() => setTranslationType('title')}
          isTranslationPanelOpen={translationType === 'title'}
          onBlur={(translations: SupportedLanguage) =>
            handleSave({ ...resourceData, title: translations })
          }
          required
          errors={validationErrors.filter((error) => error.field === 'title')}
        />
        <ResourceLanguageTextField
          id='description'
          label={t('resourceadm.about_resource_resource_description_label')}
          description={t('resourceadm.about_resource_resource_description_text')}
          translationDescription={t('resourceadm.about_resource_translation_description')}
          isTranslationPanelOpen={translationType === 'description'}
          useTextArea
          value={resourceData.description}
          onFocus={() => setTranslationType('description')}
          onBlur={(translations: SupportedLanguage) =>
            handleSave({ ...resourceData, description: translations })
          }
          required
          errors={validationErrors.filter((error) => error.field === 'description')}
        />
        {resourceData.resourceType === 'Consent' && (
          <>
            <ResourceRadioGroup
              id='consentTemplate'
              label={t('resourceadm.about_resource_consent_template_label')}
              description={t('resourceadm.about_resource_consent_template_text')}
              value={resourceData.consentTemplate}
              options={consentTemplateOptions}
              onFocus={() => setTranslationType('none')}
              onChange={(selected: string) =>
                handleSave({ ...resourceData, consentTemplate: selected })
              }
              required
              errors={validationErrors.filter((error) => error.field === 'consentTemplate')}
            />
            {!consentTemplateOptions.length && (
              <StudioAlert data-color='danger'>
                {t('resourceadm.about_resource_consent_templates_error')}
              </StudioAlert>
            )}
            <ResourceTextField
              id='consentMetadata'
              label={t('resourceadm.about_resource_consent_metadata')}
              description={t('resourceadm.about_resource_consent_metadata_description')}
              value={Object.keys(resourceData.consentMetadata ?? {}).join(', ')}
              onFocus={() => setTranslationType('none')}
              onBlur={(val: string) =>
                handleSave({
                  ...resourceData,
                  consentMetadata: convertMetadataStringToConsentMetadata(val),
                })
              }
            />
            <ResourceLanguageTextField
              id='consentText'
              label={t('resourceadm.about_resource_consent_text_label')}
              description={t('resourceadm.about_resource_consent_text_text')}
              translationDescription='Samtykketekst'
              isTranslationPanelOpen={translationType === 'consentText'}
              useTextArea
              value={resourceData.consentText}
              onFocus={() => setTranslationType('consentText')}
              onBlur={(consentTexts: SupportedLanguage) =>
                handleSave({ ...resourceData, consentText: consentTexts })
              }
              required
              errors={validationErrors.filter((error) => error.field === 'consentText')}
            />
            <ResourceSwitchInput
              id='isOneTimeConsent'
              label={t('resourceadm.about_resource_one_time_consent_label')}
              value={resourceData.isOneTimeConsent ?? true}
              onFocus={() => setTranslationType('none')}
              onChange={(isChecked: boolean) =>
                handleSave({ ...resourceData, isOneTimeConsent: isChecked })
              }
              toggleTextTranslationKey='resourceadm.about_resource_one_time_consent_show_text'
            />
          </>
        )}
        <ResourceTextField
          id='homepage'
          label={t('resourceadm.about_resource_homepage_label')}
          description={t('resourceadm.about_resource_homepage_text')}
          value={resourceData.homepage ?? ''}
          onFocus={() => setTranslationType('none')}
          onBlur={(val: string) => handleSave({ ...resourceData, homepage: val })}
        />
        <ResourceSwitchInput
          id='delegable'
          label={t('resourceadm.about_resource_delegable_label')}
          value={resourceData.delegable ?? true}
          onFocus={() => setTranslationType('none')}
          onChange={(isChecked: boolean) => handleSave({ ...resourceData, delegable: isChecked })}
          toggleTextTranslationKey='resourceadm.about_resource_delegable_show_text'
        />
        {resourceData.delegable && (
          <ResourceLanguageTextField
            id='rightDescription'
            label={t('resourceadm.about_resource_rights_description_label')}
            description={t('resourceadm.about_resource_rights_description_text')}
            translationDescription={t('resourceadm.about_resource_translation_right_description')}
            isTranslationPanelOpen={translationType === 'rightDescription'}
            useTextArea
            value={resourceData.rightDescription}
            onFocus={() => setTranslationType('rightDescription')}
            onBlur={(translations: SupportedLanguage) =>
              handleSave({ ...resourceData, rightDescription: translations })
            }
            required
            errors={validationErrors.filter((error) => error.field === 'rightDescription')}
          />
        )}
        <ResourceTextField
          id='keywords'
          label={t('resourceadm.about_resource_keywords_label')}
          description={t('resourceadm.about_resource_keywords_text')}
          value={resourceData.keywords ? mapKeywordsArrayToString(resourceData.keywords) : ''}
          onFocus={() => setTranslationType('none')}
          onBlur={(val: string) =>
            handleSave({ ...resourceData, keywords: mapKeywordStringToKeywordTypeArray(val) })
          }
        />
        <ResourceRadioGroup
          id='status'
          label={t('resourceadm.about_resource_status_label')}
          value={resourceData.status}
          options={statusOptions}
          onFocus={() => setTranslationType('none')}
          onChange={(selected: ResourceStatusOption) =>
            handleSave({ ...resourceData, status: selected })
          }
          required
          errors={validationErrors.filter((error) => error.field === 'status')}
        />
        {resourceData.resourceType !== 'MaskinportenSchema' && (
          <ResourceSwitchInput
            id='selfIdentifiedUserEnabled'
            label={t('resourceadm.about_resource_self_identified_label')}
            description={t('resourceadm.about_resource_self_identified_text')}
            value={resourceData.selfIdentifiedUserEnabled ?? false}
            onFocus={() => setTranslationType('none')}
            onChange={(isChecked: boolean) =>
              handleSave({ ...resourceData, selfIdentifiedUserEnabled: isChecked })
            }
            toggleTextTranslationKey='resourceadm.about_resource_self_identified_show_text'
          />
        )}
        {resourceData.resourceType !== 'MaskinportenSchema' && (
          <ResourceSwitchInput
            id='enterpriseUserEnabled'
            label={t('resourceadm.about_resource_enterprise_label')}
            description={t('resourceadm.about_resource_enterprise_text')}
            value={resourceData.enterpriseUserEnabled ?? false}
            onFocus={() => setTranslationType('none')}
            onChange={(isChecked: boolean) =>
              handleSave({ ...resourceData, enterpriseUserEnabled: isChecked })
            }
            toggleTextTranslationKey='resourceadm.about_resource_enterprise_show_text'
          />
        )}
        {resourceData.resourceType !== 'MaskinportenSchema' && (
          <ResourceCheckboxGroup
            id='availableForType'
            options={availableForOptions}
            legend={t('resourceadm.about_resource_available_for_legend')}
            description={t('resourceadm.about_resource_available_for_description')}
            errors={validationErrors.filter((error) => error.field === 'availableForType')}
            onFocus={() => setTranslationType('none')}
            onChange={(selected: ResourceAvailableForTypeOption[]) =>
              handleSave({ ...resourceData, availableForType: selected })
            }
            required
            value={resourceData.availableForType ?? []}
          />
        )}
        {resourceData.resourceType === 'MaskinportenSchema' && (
          <ResourceReferenceFields
            onFocus={() => setTranslationType('none')}
            resourceReferenceList={resourceData.resourceReferences}
            onResourceReferenceFieldChanged={(resourceReferences: ResourceReference[]) => {
              handleSave({ ...resourceData, resourceReferences: resourceReferences });
            }}
            required
            errors={validationErrors.filter((x) => x.field === 'resourceReferences')}
          />
        )}
        <ResourceContactPointFields
          onFocus={() => setTranslationType('none')}
          contactPointList={resourceData.contactPoints}
          onContactPointsChanged={(contactPoints: ResourceContactPoint[]) =>
            handleSave({ ...resourceData, contactPoints: contactPoints })
          }
          required
          errors={validationErrors.filter((x) => x.field === 'contactPoints')}
        />
        <ResourceSwitchInput
          id='visible'
          label={t('resourceadm.about_resource_visible_label')}
          description={t('resourceadm.about_resource_visible_text')}
          value={resourceData.visible ?? false}
          onFocus={() => setTranslationType('none')}
          onChange={(isChecked: boolean) => handleSave({ ...resourceData, visible: isChecked })}
          toggleTextTranslationKey='resourceadm.about_resource_visible_show_text'
        />
        {resourceData.resourceType !== 'Consent' && (
          <ResourceSwitchInput
            id='accessListMode'
            label={t('resourceadm.about_resource_limited_by_rrr_label')}
            description={t('resourceadm.about_resource_limited_by_rrr_description')}
            value={resourceData.accessListMode === 'Enabled'}
            onFocus={() => setTranslationType('none')}
            onChange={(isChecked: boolean) =>
              handleSave({ ...resourceData, accessListMode: isChecked ? 'Enabled' : 'Disabled' })
            }
            toggleTextTranslationKey='resourceadm.about_resource_use_rrr_show_text'
          />
        )}
        {resourceData.accessListMode === 'Enabled' && (
          <div data-testid='rrr-buttons'>
            <AccessListEnvLinks />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={classes.wrapper} id={id} role='tabpanel'>
      <div className={classes.pageWrapper}>{displayContent()}</div>
    </div>
  );
};
