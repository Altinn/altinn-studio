import React, { useState } from 'react';
import classes from './AboutResourcePage.module.css';
import { Heading } from '@digdir/design-system-react';
import type { Translation } from '../../types/Translation';
import type {
  Resource,
  ResourceTypeOption,
  ResourceStatusOption,
  ResourceAvailableForTypeOption,
  ResourceContactPoint,
  SupportedLanguage,
  ResourceReference,
} from 'app-shared/types/ResourceAdm';
import {
  availableForTypeMap,
  resourceStatusMap,
  mapKeywordStringToKeywordTypeArray,
  mapKeywordsArrayToString,
  resourceTypeMap,
} from '../../utils/resourceUtils/resourceUtils';
import { useTranslation } from 'react-i18next';
import {
  ResourceCheckboxGroup,
  ResourceLanguageTextField,
  ResourceSwitchInput,
  ResourceTextField,
  ResourceRadioGroup,
} from '../../components/ResourcePageInputs';
import { ResourceContactPointFields } from '../../components/ResourceContactPointFields';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { ResourceReferenceFields } from '../../components/ResourceReferenceFields';
import { AccessListEnvLinks } from 'resourceadm/components/AccessListEnvLinks';

export type AboutResourcePageProps = {
  showAllErrors: boolean;
  resourceData: Resource;
  onSaveResource: (r: Resource) => void;
  id: string;
};

/**
 * @component
 *    Page that displays information about a resource
 *
 * @property {boolean}[showAllErrors] - Flag to decide if all errors should be shown or not
 * @property {Resource}[resourceData] - The metadata for the resource
 * @property {function}[onSaveResource] - Function to be handled when saving the resource
 * @property {string}[id] - The id of the page
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const AboutResourcePage = ({
  showAllErrors,
  resourceData,
  onSaveResource,
  id,
}: AboutResourcePageProps): React.JSX.Element => {
  const { t } = useTranslation();

  /**
   * Resource type options
   */
  const resourceTypeOptions = Object.entries(resourceTypeMap).map(([key, value]) => ({
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
        <Heading size='large' level={1}>
          {t('resourceadm.about_resource_title')}
        </Heading>
        <ResourceRadioGroup
          label={t('resourceadm.about_resource_resource_type')}
          description={t('resourceadm.about_resource_resource_type_label')}
          value={resourceData.resourceType}
          options={resourceTypeOptions}
          hasError={
            showAllErrors && !Object.keys(resourceTypeMap).includes(resourceData.resourceType)
          }
          onFocus={() => setTranslationType('none')}
          onChange={(selected: ResourceTypeOption) =>
            handleSave({ ...resourceData, resourceType: selected })
          }
          required
          errorText={t('resourceadm.about_resource_resource_type_error')}
        />
        <ResourceLanguageTextField
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
          errorText={showAllErrors ? t('resourceadm.about_resource_error_usage_string_title') : ''}
        />
        <ResourceLanguageTextField
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
          errorText={
            showAllErrors ? t('resourceadm.about_resource_error_usage_string_description') : ''
          }
        />
        <ResourceTextField
          label={t('resourceadm.about_resource_homepage_label')}
          description={t('resourceadm.about_resource_homepage_text')}
          value={resourceData.homepage ?? ''}
          onFocus={() => setTranslationType('none')}
          onBlur={(val: string) => handleSave({ ...resourceData, homepage: val })}
        />
        <ResourceSwitchInput
          label={t('resourceadm.about_resource_delegable_label')}
          description={t('resourceadm.about_resource_delegable_text')}
          value={resourceData.delegable ?? true}
          onFocus={() => setTranslationType('none')}
          onChange={(isChecked: boolean) => handleSave({ ...resourceData, delegable: isChecked })}
          id='isDelegableSwitch'
          descriptionId='isDelegableSwitchDescription'
          toggleTextTranslationKey='resourceadm.about_resource_delegable_show_text'
        />
        {resourceData.delegable && (
          <ResourceLanguageTextField
            label={t('resourceadm.about_resource_rights_description_label')}
            description={t('resourceadm.about_resource_rights_description_text')}
            translationDescription={t('resourceadm.about_resource_translation_right_description')}
            isTranslationPanelOpen={translationType === 'rightDescription'}
            value={resourceData.rightDescription}
            onFocus={() => setTranslationType('rightDescription')}
            onBlur={(translations: SupportedLanguage) =>
              handleSave({ ...resourceData, rightDescription: translations })
            }
            required
            errorText={
              showAllErrors && resourceData.delegable
                ? t('resourceadm.about_resource_error_usage_string_rights_description')
                : ''
            }
          />
        )}
        <ResourceTextField
          label={t('resourceadm.about_resource_keywords_label')}
          description={t('resourceadm.about_resource_keywords_text')}
          value={resourceData.keywords ? mapKeywordsArrayToString(resourceData.keywords) : ''}
          onFocus={() => setTranslationType('none')}
          onBlur={(val: string) =>
            handleSave({ ...resourceData, keywords: mapKeywordStringToKeywordTypeArray(val) })
          }
        />
        <ResourceRadioGroup
          label={t('resourceadm.about_resource_status_label')}
          description={t('resourceadm.about_resource_status_text')}
          value={resourceData.status}
          options={statusOptions}
          hasError={showAllErrors && !Object.keys(resourceStatusMap).includes(resourceData.status)}
          onFocus={() => setTranslationType('none')}
          onChange={(selected: ResourceStatusOption) =>
            handleSave({ ...resourceData, status: selected })
          }
          required
          errorText={t('resourceadm.about_resource_status_error')}
        />
        {resourceData.resourceType !== 'MaskinportenSchema' && (
          <ResourceSwitchInput
            label={t('resourceadm.about_resource_self_identified_label')}
            description={t('resourceadm.about_resource_self_identified_text')}
            value={resourceData.selfIdentifiedUserEnabled ?? false}
            onFocus={() => setTranslationType('none')}
            onChange={(isChecked: boolean) =>
              handleSave({ ...resourceData, selfIdentifiedUserEnabled: isChecked })
            }
            id='selfIdentifiedUsersEnabledSwitch'
            descriptionId='selfIdentifiedUsersEnabledSwitchDescription'
            toggleTextTranslationKey='resourceadm.about_resource_self_identified_show_text'
          />
        )}
        {resourceData.resourceType !== 'MaskinportenSchema' && (
          <ResourceSwitchInput
            label={t('resourceadm.about_resource_enterprise_label')}
            description={t('resourceadm.about_resource_enterprise_text')}
            value={resourceData.enterpriseUserEnabled ?? false}
            onFocus={() => setTranslationType('none')}
            onChange={(isChecked: boolean) =>
              handleSave({ ...resourceData, enterpriseUserEnabled: isChecked })
            }
            id='enterpriseUserEnabledSwitch'
            descriptionId='enterpriseUserEnabledSwitchDescription'
            toggleTextTranslationKey='resourceadm.about_resource_enterprise_show_text'
          />
        )}
        {resourceData.resourceType !== 'MaskinportenSchema' && (
          <ResourceCheckboxGroup
            options={availableForOptions}
            legend={t('resourceadm.about_resource_available_for_legend')}
            description={t('resourceadm.about_resource_available_for_description')}
            showErrors={showAllErrors}
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
            showErrors={showAllErrors}
          />
        )}
        <ResourceContactPointFields
          onFocus={() => setTranslationType('none')}
          contactPointList={resourceData.contactPoints}
          onContactPointsChanged={(contactPoints: ResourceContactPoint[]) =>
            handleSave({ ...resourceData, contactPoints: contactPoints })
          }
          required
          showErrors={showAllErrors}
        />
        <ResourceSwitchInput
          label={t('resourceadm.about_resource_visible_label')}
          description={t('resourceadm.about_resource_visible_text')}
          value={resourceData.visible ?? false}
          onFocus={() => setTranslationType('none')}
          onChange={(isChecked: boolean) => handleSave({ ...resourceData, visible: isChecked })}
          id='isVisibleSwitch'
          descriptionId='isVisibleSwitchDescription'
          toggleTextTranslationKey='resourceadm.about_resource_visible_show_text'
        />
        {shouldDisplayFeature('resourceAccessLists') && (
          <>
            <ResourceSwitchInput
              label={t('resourceadm.about_resource_limited_by_rrr_label')}
              description={t('resourceadm.about_resource_limited_by_rrr_description')}
              value={resourceData.limitedByRRR ?? false}
              onFocus={() => setTranslationType('none')}
              onChange={(isChecked: boolean) =>
                handleSave({ ...resourceData, limitedByRRR: isChecked })
              }
              id='limitedByRRRSwitch'
              descriptionId='limitedByRRRSwitchSwitchDescription'
              toggleTextTranslationKey='resourceadm.about_resource_use_rrr_show_text'
            />
            {resourceData.limitedByRRR && (
              <div data-testid='rrr-buttons'>
                <AccessListEnvLinks />
              </div>
            )}
          </>
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
