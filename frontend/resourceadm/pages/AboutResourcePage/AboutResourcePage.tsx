import React, { useRef, useState } from 'react';
import classes from './AboutResourcePage.module.css';
import {
  Select,
  ErrorMessage,
  Heading,
  Paragraph,
  Label,
  Checkbox,
} from '@digdir/design-system-react';
import { Switch } from 'resourceadm/components/Switch';
import { useParams } from 'react-router-dom';
import type { SupportedLanguage, Translation } from 'resourceadm/types/global';
import type {
  SupportedLanguageKey,
  Resource,
  ResourceTypeOption,
  ResourceStatusOption,
  ResourceAvailableForTypeOption,
} from 'app-shared/types/ResourceAdm';
import { RightTranslationBar } from 'resourceadm/components/RightTranslationBar';
import {
  getMissingInputLanguageString,
  getResourcePageTextfieldError,
} from 'resourceadm/utils/resourceUtils';
import {
  availableForTypeMap,
  resourceStatusMap,
  mapKeywordStringToKeywordTypeArray,
  mapKeywordsArrayToString,
  resourceTypeMap,
} from 'resourceadm/utils/resourceUtils/resourceUtils';
import { useTranslation } from 'react-i18next';
import {
  ResourceLanguageTextArea,
  ResourceLanguageTextField,
  ResourceSwitchInput,
  ResourceTextField,
} from 'resourceadm/components/AboutResourcePageInputs';

/**
 * Initial value for languages with empty fields
 */
const emptyLangauges: SupportedLanguage = { nb: '', nn: '', en: '' };

export type AboutResourcePageProps = {
  /**
   * Flag to decide if all errors should be shown or not
   */
  showAllErrors: boolean;
  /**
   * The metadata for the resource
   */
  resourceData: Resource;
  /**
   * Function to be handled when saving the resource
   * @param r the resource
   * @returns void
   */
  onSaveResource: (r: Resource) => void;
};

/**
 * @component
 *    Page that displays information about a resource
 *
 * @property {boolean}[showAllErrors] - Flag to decide if all errors should be shown or not
 * @property {Resource}[resourceData] - The metadata for the resource
 * @property {function}[onSaveResource] - Function to be handled when saving the resource
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const AboutResourcePage = ({
  showAllErrors,
  resourceData,
  onSaveResource,
}: AboutResourcePageProps): React.ReactNode => {
  const { t } = useTranslation();

  const { resourceId } = useParams();

  //
  //
  //
  // TODO - FIX VALIDATION TO CHECK AND ADD ERROR TO THE NEW FIELDS
  //
  // TODO - CHECK THAT THE TAB SEQUENCE IS CORRECT
  //
  // TODO - Can each input field and type be its own reusable component?
  //
  //
  //

  /**
   * Resource type options
   */
  const resourceTypeOptions = Object.keys(resourceTypeMap).map((key) => ({
    value: key,
    label: resourceTypeMap[key],
  }));

  /**
   * Status options
   */
  const statusOptions = Object.keys(resourceStatusMap).map((key) => ({
    value: key,
    label: resourceStatusMap[key],
  }));

  /**
   * Available for options
   */
  const acailableForOptions = Object.keys(availableForTypeMap).map((key) => ({
    value: key,
    label: availableForTypeMap[key],
  }));

  // States to store the different input values
  const [resourceType, setResourceType] = useState<ResourceTypeOption>(resourceData.resourceType);
  const [title, setTitle] = useState<SupportedLanguageKey<string>>(
    resourceData.title ?? emptyLangauges
  );
  const [description, setDescription] = useState<SupportedLanguageKey<string>>(
    resourceData.description ?? emptyLangauges
  );
  const [rightDescription, setRightDescription] = useState<SupportedLanguageKey<string>>(
    resourceData.rightDescription ?? emptyLangauges
  );
  const [isVisible, setIsVisible] = useState(resourceData.visible ?? false);
  const [resourceStatus, setResourceStatus] = useState<ResourceStatusOption>(resourceData.status);
  const [availableForType, setAvailableForType] = useState<ResourceAvailableForTypeOption[]>(
    resourceData.availableForType
  );

  // To handle which translation value is shown in the right menu
  const [translationType, setTranslationType] = useState<Translation>('none');

  // To handle the error state of the page
  const [hasResourceTypeError, setHasResourceTypeError] = useState(
    resourceData.resourceType === undefined || resourceData.resourceType === null
  );
  const [hasTitleError, setHasTitleError] = useState(
    getResourcePageTextfieldError(resourceData.title)
  );
  const [hasDescriptionError, setHasDescriptionError] = useState(
    getResourcePageTextfieldError(resourceData.description)
  );
  const [hasRightDescriptionError, setHasRightDescriptionError] = useState(
    getResourcePageTextfieldError(resourceData.rightDescription)
  );

  // useRefs to handle tabbing between the input elements and the right translation bar
  const rightTranslationBarRef = useRef(null);
  const titleFieldRef = useRef(null);
  const descriptionFieldRef = useRef(null);
  const homePageRef = useRef(null);
  const rightDescriptionRef = useRef(null);
  const isVisibleRef = useRef(null);

  /**
   * Function that saves the resource to backend
   */
  const handleSaveResource = () => {
    const editedResourceObject: Resource = {
      ...resourceData,
      identifier: resourceId,
      resourceType,
      title,
      description,
      visible: isVisible,
      status: resourceStatus,
      availableForType,
      rightDescription,
    };
    handleSave(editedResourceObject);
  };

  const handleSave = (res: Resource) => {
    onSaveResource(res);
  };

  /**
   * Handles the change in the dropdown of resource type. Based on the string
   * selected it updates the resource type with the correct key.
   *
   * @param type the selected string
   */
  const handleChangeResourceType = (type: ResourceTypeOption) => {
    setResourceType(type);
    setHasResourceTypeError(!Object.keys(resourceTypeMap).includes(type));
  };

  /**
   * Handles the change in the dropdown of resource status option. Based on the string
   * selected it updates the status option with the correct key.
   *
   * @param type the selected string
   */
  const handleChangeStatusOption = (type: ResourceStatusOption) => {
    setResourceStatus(type);
  };

  /**
   * Displays the given text in a warning card
   *
   * @param text the text to display
   */
  const displayWarningCard = (text: string) => {
    return (
      <div className={classes.warningCardWrapper}>
        <ErrorMessage size='small'>{text}</ErrorMessage>
      </div>
    );
  };

  /**
   * Sets the values of the selected field and updates if the error is shown or not.
   *
   * @param value the value typed in the input field
   */
  const handleChangeTranslationValues = (value: SupportedLanguage) => {
    const error = value.nb === '' || value.nn === '' || value.en === '';
    if (translationType === 'title') {
      setHasTitleError(error);
      setTitle(value);
    }
    if (translationType === 'description') {
      setHasDescriptionError(error);
      setDescription(value);
    }
    if (translationType === 'rightDescription') {
      setHasRightDescriptionError(error);
      setRightDescription(value);
    }
  };

  /**
   * Function that handles the tabbing into the right translation bar
   */
  const handleTabKeyIntoRightBar = (e: any) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (rightTranslationBarRef.current) {
        rightTranslationBarRef.current.focus();
      }
    }
  };

  /**
   * Function that handles the leaving of the right translation bar.
   * It sets the ref to the next element on the page so that the
   * navigation feels natural.
   */
  const handleLeaveLastFieldRightBar = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === 'Tab') {
      if (translationType === 'title') {
        if (descriptionFieldRef.current) {
          e.preventDefault();
          descriptionFieldRef.current.focus();
        }
      }
      if (translationType === 'description') {
        if (homePageRef.current) {
          e.preventDefault();
          homePageRef.current.focus();
        }
      }
      if (translationType === 'rightDescription') {
        if (isVisibleRef.current) {
          e.preventDefault();
          isVisibleRef.current.focus(null);
        }
      }
    }
  };

  const handleChangeAvailableFortype = (value: ResourceAvailableForTypeOption[]) => {
    setAvailableForType(value);
    //handleSaveResource();
  };

  const displayAvailableForCheckboxes = () => {
    return acailableForOptions.map((option) => (
      <Checkbox value={option.value} key={option.value} size='small'>
        {t(option.label)}
      </Checkbox>
    ));
  };

  /**
   * Displays the correct content in the right translation bar.
   */
  const displayRightTranslationBar = () => {
    return (
      <div className={classes.rightWrapper}>
        <RightTranslationBar
          title={
            translationType === 'title'
              ? t('resourceadm.about_resource_translation_title')
              : translationType === 'description'
              ? t('resourceadm.about_resource_translation_description')
              : t('resourceadm.about_resource_translation_right_description')
          }
          value={
            translationType === 'title'
              ? title
              : translationType === 'description'
              ? description
              : rightDescription
          }
          onLanguageChange={handleChangeTranslationValues}
          usesTextArea={translationType === 'description'}
          showErrors={showAllErrors}
          ref={rightTranslationBarRef}
          onLeaveLastField={handleLeaveLastFieldRightBar}
          onBlur={handleSaveResource}
        />
      </div>
    );
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
        {/* MANDATORY - MUST HAVE ERROR HANDLING */}
        <Label size='medium' spacing htmlFor='aboutResourceType'>
          {t('resourceadm.about_resource_resource_type')}
        </Label>
        <Paragraph short size='small'>
          {t('resourceadm.about_resource_resource_type_label')}
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Select
            options={resourceTypeOptions.map((o) => ({ ...o, label: t(o.label) }))}
            onChange={handleChangeResourceType}
            value={resourceType}
            onFocus={() => setTranslationType('none')}
            error={showAllErrors && hasResourceTypeError}
            // onBlur={handleSaveResource}
            inputId='aboutResourceType'
          />
          {showAllErrors &&
            hasResourceTypeError &&
            displayWarningCard(t('resourceadm.about_resource_resource_type_error'))}
        </div>
        {/* MANDATORY - MUST HAVE ERROR HANDLING */}
        <ResourceLanguageTextField
          label={t('resourceadm.about_resource_resource_title_label')}
          description={t('resourceadm.about_resource_resource_title_text')}
          value={title['nb']}
          onFocus={() => setTranslationType('title')}
          id='aboutNBTitle'
          isValid={!(showAllErrors && hasTitleError && title['nb'] === '')}
          ref={titleFieldRef}
          onKeyDown={handleTabKeyIntoRightBar}
          onChangeValue={(value: string) => handleChangeTranslationValues({ ...title, nb: value })}
          onBlur={handleSaveResource}
          showErrorMessage={showAllErrors && hasTitleError}
          errorText={getMissingInputLanguageString(
            title,
            t('resourceadm.about_resource_error_usage_string_title'),
            t
          )}
        />
        {/* MANDATORY - MUST HAVE ERROR HANDLING */}
        <ResourceLanguageTextArea
          label={t('resourceadm.about_resource_resource_description_label')}
          description={t('resourceadm.about_resource_resource_description_text')}
          value={description['nb']}
          onFocus={() => setTranslationType('description')}
          id='aboutNBDescription'
          isValid={!(showAllErrors && hasDescriptionError && description['nb'] === '')}
          ref={descriptionFieldRef}
          onKeyDown={handleTabKeyIntoRightBar}
          onChangeValue={(value: string) => {
            handleChangeTranslationValues({ ...description, nb: value });
          }}
          onBlur={handleSaveResource}
          showErrorMessage={showAllErrors && hasDescriptionError}
          errorText={getMissingInputLanguageString(
            description,
            t('resourceadm.about_resource_error_usage_string_description'),
            t
          )}
        />
        {/* OPTIONAL */}
        <ResourceTextField
          label={t('resourceadm.about_resource_homepage_label')}
          description={t('resourceadm.about_resource_homepage_text')}
          value={resourceData.homepage ?? ''}
          onFocus={() => setTranslationType('none')}
          ref={homePageRef}
          id='aboutHomepage'
          onBlur={(val: string) => handleSave({ ...resourceData, homepage: val })}
        />
        {/* OPTIONAL */}
        <ResourceTextField
          label={t('resourceadm.about_resource_keywords_label')}
          description={t('resourceadm.about_resource_keywords_text')}
          value={resourceData.keywords ? mapKeywordsArrayToString(resourceData.keywords) : ''}
          onFocus={() => setTranslationType('none')}
          ref={homePageRef}
          id='aboutKeywords'
          onBlur={(val: string) =>
            handleSave({ ...resourceData, keywords: mapKeywordStringToKeywordTypeArray(val) })
          }
        />
        {/* MANDATORY - MUST HAVE ERROR HANDLING */}
        <ResourceSwitchInput
          label={t('resourceadm.about_resource_delegable_label')}
          description={t('resourceadm.about_resource_delegable_text')}
          value={resourceData.delegable ?? true}
          onFocus={() => setTranslationType('none')}
          onBlur={(isChecked: boolean) => handleSave({ ...resourceData, delegable: isChecked })}
          id='isDelegableSwitch'
          toggleTextTranslationKey='resourceadm.about_resource_delegable_show_text'
        />
        {/* MANDATORY IF DELEGABLE IS TRUE - MUST HAVE ERROR HANDLING */}
        <ResourceLanguageTextField
          label={t('resourceadm.about_resource_rights_description_label')}
          description={t('resourceadm.about_resource_rights_description_label')}
          value={rightDescription['nb']}
          onFocus={() => setTranslationType('rightDescription')}
          id='aboutNBRightDescription'
          isValid={!(showAllErrors && hasRightDescriptionError && rightDescription['nb'] === '')}
          ref={rightDescriptionRef}
          onKeyDown={handleTabKeyIntoRightBar}
          onChangeValue={(value: string) =>
            handleChangeTranslationValues({ ...rightDescription, nb: value })
          }
          onBlur={handleSaveResource}
          showErrorMessage={showAllErrors && hasRightDescriptionError}
          errorText={getMissingInputLanguageString(
            rightDescription,
            t('resourceadm.about_resource_error_usage_string_rights_description'),
            t
          )}
        />
        {/* OPTIONAL */}
        <div className={classes.divider} />
        <Label size='medium' spacing htmlFor='aboutResourceStatus'>
          {t('resourceadm.about_resource_status_label')}
        </Label>
        <Paragraph short size='small'>
          {t('resourceadm.about_resource_status_text')}
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Select
            options={statusOptions.map((o) => ({ ...o, label: t(o.label) }))}
            onChange={handleChangeStatusOption}
            value={resourceStatus}
            label={t('resourceadm.about_resource_status_label')}
            hideLabel
            onFocus={() => setTranslationType('none')}
            onBlur={handleSaveResource}
          />
        </div>
        <ResourceSwitchInput
          label={t('resourceadm.about_resource_self_identified_label')}
          description={t('resourceadm.about_resource_self_identified_text')}
          value={resourceData.selfIdentifiedUserEnabled ?? false}
          onFocus={() => setTranslationType('none')} // TODO
          onBlur={(isChecked: boolean) =>
            handleSave({ ...resourceData, selfIdentifiedUserEnabled: isChecked })
          }
          id='selfIdentifiedUsersEnabledSwitch'
          toggleTextTranslationKey='resourceadm.about_resource_self_identified_show_text'
        />
        <ResourceSwitchInput
          label={t('resourceadm.about_resource_enterprise_label')}
          description={t('resourceadm.about_resource_enterprise_text')}
          value={resourceData.enterpriseUserEnabled ?? false}
          onFocus={() => setTranslationType('none')} // TODO
          onBlur={(isChecked: boolean) =>
            handleSave({ ...resourceData, enterpriseUserEnabled: isChecked })
          }
          id='enterpriseUserEnabledSwitch'
          toggleTextTranslationKey='resourceadm.about_resource_enterprise_show_text'
        />
        {/* MANDATORY - MUST HAVE ERROR HANDLING */}
        <div className={classes.divider} />
        <div className={classes.inputWrapper}>
          <Checkbox.Group
            legend={t('resourceadm.about_resource_available_for_legend')}
            error={false} // TODO
            onChange={handleChangeAvailableFortype}
            // TODO - sett value!
          >
            <Paragraph as='span' size='small' short className={classes.checkboxParagraph}>
              {t('resourceadm.about_resource_available_for_description')}
            </Paragraph>
            {displayAvailableForCheckboxes()}
          </Checkbox.Group>
        </div>
        <div className={classes.divider} />
        <Label size='medium' spacing>
          {t('resourceadm.about_resource_visible_label')}
        </Label>
        <Paragraph short size='small'>
          {t('resourceadm.about_resource_visible_text')}
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Switch
            isChecked={isVisible}
            onToggle={(b: boolean) => setIsVisible(b)}
            onFocus={() => setTranslationType('none')}
            ref={isVisibleRef}
            onBlur={handleSaveResource}
            id='isVisibleSwitch'
          />
          <p className={isVisible ? classes.toggleTextActive : classes.toggleTextInactive}>
            {t('resourceadm.about_resource_visible_show_text', {
              showText: isVisible
                ? t('resourceadm.switch_should')
                : t('resourceadm.switch_should_not'),
            })}
          </p>
        </div>
      </>
    );
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.pageWrapper}>{displayContent()}</div>
      {translationType !== 'none' && displayRightTranslationBar()}
    </div>
  );
};
