import React, { useState } from 'react';
import classes from './AboutResourcePage.module.css';
import { Heading } from '@digdir/design-system-react';
import { useParams } from 'react-router-dom';
import type { SupportedLanguage, Translation } from 'resourceadm/types/global';
import type {
  Resource,
  ResourceTypeOption,
  ResourceStatusOption,
  ResourceAvailableForTypeOption,
  ResourceContactPoint,
} from 'app-shared/types/ResourceAdm';
import { RightTranslationBar } from 'resourceadm/components/RightTranslationBar';
import { getMissingInputLanguageString } from 'resourceadm/utils/resourceUtils';
import {
  availableForTypeMap,
  resourceStatusMap,
  mapKeywordStringToKeywordTypeArray,
  mapKeywordsArrayToString,
  resourceTypeMap,
} from 'resourceadm/utils/resourceUtils/resourceUtils';
import { useTranslation } from 'react-i18next';
import {
  ResourceCheckboxGroup,
  ResourceLanguageTextArea,
  ResourceLanguageTextField,
  ResourceSwitchInput,
  ResourceTextField,
  ResourceDropdown,
} from 'resourceadm/components/ResourcePageInputs';
import { ResourceContactPointFields } from 'resourceadm/components/ResourceContactPointFields';

/**
 * Initial value for languages with empty fields
 */
const emptyLanguages: SupportedLanguage = { nb: '', nn: '', en: '' };

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
 * @returns {React.ReactNode} - The rendered component
 */
export const AboutResourcePage = ({
  showAllErrors,
  resourceData,
  onSaveResource,
  id,
}: AboutResourcePageProps): React.ReactNode => {
  const { t } = useTranslation();

  const { resourceId } = useParams();

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

  // States to store the different input values
  const [title, setTitle] = useState<SupportedLanguage>(resourceData.title ?? emptyLanguages);
  const [description, setDescription] = useState<SupportedLanguage>(
    resourceData.description ?? emptyLanguages,
  );
  const [rightDescription, setRightDescription] = useState<SupportedLanguage>(
    resourceData.rightDescription ?? emptyLanguages,
  );

  // To handle which translation value is shown in the right menu
  const [translationType, setTranslationType] = useState<Translation>('none');

  /**
   * Function that saves the resource to backend
   */
  const handleSaveResource = () => {
    const editedResourceObject: Resource = {
      ...resourceData,
      identifier: resourceId,
      title,
      description,
      rightDescription,
    };
    handleSave(editedResourceObject);
  };

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
      <>
        <Heading size='large' spacing level={1}>
          {t('resourceadm.about_resource_title')}
        </Heading>
        <ResourceDropdown
          label={t('resourceadm.about_resource_resource_type')}
          description={t('resourceadm.about_resource_resource_type_label')}
          value={resourceData.resourceType}
          options={resourceTypeOptions}
          hasError={
            showAllErrors && !Object.keys(resourceTypeMap).includes(resourceData.resourceType)
          }
          onFocus={() => setTranslationType('none')}
          onBlur={(selected: ResourceTypeOption) =>
            handleSave({ ...resourceData, resourceType: selected })
          }
          id='aboutResourceType'
          errorText={t('resourceadm.about_resource_resource_type_error')}
        />
        <ResourceLanguageTextField
          label={t('resourceadm.about_resource_resource_title_label')}
          description={t('resourceadm.about_resource_resource_title_text')}
          value={title['nb']}
          onFocus={() => setTranslationType('title')}
          onChangeValue={(value: string) =>
            setTitle((oldTitle) => {
              return { ...oldTitle, nb: value };
            })
          }
          onBlur={handleSaveResource}
          errorText={
            showAllErrors
              ? getMissingInputLanguageString(
                  title,
                  t('resourceadm.about_resource_error_usage_string_title'),
                  t,
                )
              : ''
          }
        />
        {translationType === 'title' && (
          <RightTranslationBar
            title={t('resourceadm.about_resource_translation_title')}
            value={title}
            onLanguageChange={setTitle}
            usesTextArea={false}
            showErrors={showAllErrors}
            onBlur={handleSaveResource}
          />
        )}
        <ResourceLanguageTextArea
          label={t('resourceadm.about_resource_resource_description_label')}
          description={t('resourceadm.about_resource_resource_description_text')}
          value={description['nb']}
          onFocus={() => setTranslationType('description')}
          id='aboutNBDescription'
          onChangeValue={(value: string) => {
            setDescription((oldDescription) => {
              return { ...oldDescription, nb: value };
            });
          }}
          onBlur={handleSaveResource}
          errorText={
            showAllErrors
              ? getMissingInputLanguageString(
                  description,
                  t('resourceadm.about_resource_error_usage_string_description'),
                  t,
                )
              : ''
          }
        />
        {translationType === 'description' && (
          <RightTranslationBar
            title={t('resourceadm.about_resource_translation_description')}
            value={description}
            onLanguageChange={setDescription}
            usesTextArea={true}
            showErrors={showAllErrors}
            onBlur={handleSaveResource}
          />
        )}
        <ResourceTextField
          label={t('resourceadm.about_resource_homepage_label')}
          description={t('resourceadm.about_resource_homepage_text')}
          value={resourceData.homepage ?? ''}
          onFocus={() => setTranslationType('none')}
          id='aboutHomepage'
          onBlur={(val: string) => handleSave({ ...resourceData, homepage: val })}
        />
        <ResourceSwitchInput
          label={t('resourceadm.about_resource_delegable_label')}
          description={t('resourceadm.about_resource_delegable_text')}
          value={resourceData.delegable ?? true}
          onFocus={() => setTranslationType('none')}
          onBlur={(isChecked: boolean) => handleSave({ ...resourceData, delegable: isChecked })}
          id='isDelegableSwitch'
          descriptionId='isDelegableSwitchDescription'
          toggleTextTranslationKey='resourceadm.about_resource_delegable_show_text'
        />
        <ResourceLanguageTextField
          label={t('resourceadm.about_resource_rights_description_label')}
          description={t('resourceadm.about_resource_rights_description_text')}
          value={rightDescription['nb']}
          onFocus={() => setTranslationType('rightDescription')}
          onChangeValue={(value: string) =>
            setRightDescription((oldRightsDescription) => {
              return { ...oldRightsDescription, nb: value };
            })
          }
          onBlur={handleSaveResource}
          errorText={
            showAllErrors && resourceData.delegable
              ? getMissingInputLanguageString(
                  rightDescription,
                  t('resourceadm.about_resource_error_usage_string_rights_description'),
                  t,
                )
              : ''
          }
        />
        {translationType === 'rightDescription' && (
          <RightTranslationBar
            title={t('resourceadm.about_resource_translation_right_description')}
            value={rightDescription}
            onLanguageChange={setRightDescription}
            usesTextArea={false}
            showErrors={resourceData.delegable && showAllErrors}
            onBlur={handleSaveResource}
          />
        )}
        <ResourceTextField
          label={t('resourceadm.about_resource_keywords_label')}
          description={t('resourceadm.about_resource_keywords_text')}
          value={resourceData.keywords ? mapKeywordsArrayToString(resourceData.keywords) : ''}
          onFocus={() => setTranslationType('none')}
          id='aboutKeywords'
          onBlur={(val: string) =>
            handleSave({ ...resourceData, keywords: mapKeywordStringToKeywordTypeArray(val) })
          }
        />
        <ResourceDropdown
          spacingTop
          label={t('resourceadm.about_resource_status_label')}
          description={t('resourceadm.about_resource_status_text')}
          value={resourceData.status}
          options={statusOptions}
          hasError={showAllErrors && !Object.keys(resourceStatusMap).includes(resourceData.status)}
          onFocus={() => setTranslationType('none')}
          onBlur={(selected: ResourceStatusOption) =>
            handleSave({ ...resourceData, status: selected })
          }
          id='aboutResourceStatus'
          errorText={t('resourceadm.about_resource_status_error')}
        />
        <ResourceSwitchInput
          label={t('resourceadm.about_resource_self_identified_label')}
          description={t('resourceadm.about_resource_self_identified_text')}
          value={resourceData.selfIdentifiedUserEnabled ?? false}
          onFocus={() => setTranslationType('none')}
          onBlur={(isChecked: boolean) =>
            handleSave({ ...resourceData, selfIdentifiedUserEnabled: isChecked })
          }
          id='selfIdentifiedUsersEnabledSwitch'
          descriptionId='selfIdentifiedUsersEnabledSwitchDescription'
          toggleTextTranslationKey='resourceadm.about_resource_self_identified_show_text'
        />
        <ResourceSwitchInput
          label={t('resourceadm.about_resource_enterprise_label')}
          description={t('resourceadm.about_resource_enterprise_text')}
          value={resourceData.enterpriseUserEnabled ?? false}
          onFocus={() => setTranslationType('none')}
          onBlur={(isChecked: boolean) =>
            handleSave({ ...resourceData, enterpriseUserEnabled: isChecked })
          }
          id='enterpriseUserEnabledSwitch'
          descriptionId='enterpriseUserEnabledSwitchDescription'
          toggleTextTranslationKey='resourceadm.about_resource_enterprise_show_text'
        />
        <ResourceCheckboxGroup
          options={availableForOptions}
          legend={t('resourceadm.about_resource_available_for_legend')}
          description={t('resourceadm.about_resource_available_for_description')}
          showErrors={showAllErrors}
          onChange={(selected: ResourceAvailableForTypeOption[]) =>
            handleSave({ ...resourceData, availableForType: selected })
          }
          value={resourceData.availableForType ?? []}
        />
        <ResourceContactPointFields
          contactPointList={resourceData.contactPoints}
          onContactPointsChanged={(contactPoints: ResourceContactPoint[]) =>
            handleSave({ ...resourceData, contactPoints: contactPoints })
          }
          showErrors={showAllErrors}
        />
        <ResourceSwitchInput
          label={t('resourceadm.about_resource_visible_label')}
          description={t('resourceadm.about_resource_visible_text')}
          value={resourceData.visible ?? false}
          onFocus={() => setTranslationType('none')}
          onBlur={(isChecked: boolean) => handleSave({ ...resourceData, visible: isChecked })}
          id='isVisibleSwitch'
          descriptionId='isVisibleSwitchDescription'
          toggleTextTranslationKey='resourceadm.about_resource_visible_show_text'
        />
      </>
    );
  };

  return (
    <div className={classes.wrapper} id={id} role='tabpanel'>
      <div className={classes.pageWrapper}>{displayContent()}</div>
    </div>
  );
};
