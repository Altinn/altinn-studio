import React, { useState } from 'react';
import type { ResourceContactPoint, ResourceFormError } from 'app-shared/types/ResourceAdm';
import { StudioFieldset, StudioTextfield } from '@studio/components-legacy';
import { StudioHelpText } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { InputFieldErrorMessage } from '../ResourcePageInputs/InputFieldErrorMessage';
import { ResourceFieldHeader } from '../ResourcePageInputs/ResourceFieldHeader';
import classes from './ResourceContactPointFieldset.module.css';

type ResourceContactPointFieldsetProps = {
  /**
   * The contact point to display in the fieldset
   */
  contactPoint: ResourceContactPoint;
  /**
   * Function to be executed when leaving a text field
   * @param contactPoint the contact point
   * @returns void
   */
  onLeaveTextFields: (contactPoint: ResourceContactPoint) => void;
  /**
   * List of error messages
   */
  errors: ResourceFormError[];
  /**
   * Whether this field is required or not
   */
  required?: boolean;
  /**
   * Index of fieldset
   */
  index: number;
};

/**
 * @component
 *    Displays the fieldsset with the 4 fields in a ContactPoint
 *
 * @property {ResourceContactPoint}[contactPoint] - The contact point to display in the fieldset
 * @property {function}[onLeaveTextFields] - Function to be executed when leaving a text field
 * @property {ResourceFormError[]}[errors] - List of error messages
 * @property {boolean}[required] - Whether this field is required or not
 * @property {number}[index] - Index of fieldset
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceContactPointFieldset = ({
  contactPoint,
  onLeaveTextFields,
  errors,
  required,
  index,
}: ResourceContactPointFieldsetProps): React.JSX.Element => {
  const { t } = useTranslation();

  const [category, setCategory] = useState(contactPoint.category);
  const [email, setEmail] = useState(contactPoint.email);
  const [telephone, setTelephone] = useState(contactPoint.telephone);
  const [contactPage, setContactPage] = useState(contactPoint.contactPage);

  const fieldErrors = errors.filter((x) => x.field === 'contactPoints' && x.index === index);
  const hasError = fieldErrors.length > 0;

  return (
    <>
      <StudioFieldset
        legend={
          <ResourceFieldHeader
            label={t('resourceadm.about_resource_contact_legend', { index: index + 1 })}
            required={required}
          />
        }
        description={t('resourceadm.about_resource_contact_description')}
        size='sm'
      >
        <StudioTextfield
          id={`contactPoints-${index}`}
          label={
            <div className={classes.categoryHeader}>
              {t('resourceadm.about_resource_contact_label_category')}
              <StudioHelpText
                aria-label={`${t('resourceadm.about_resource_contact_label_category_help_prefix')} ${t('resourceadm.about_resource_contact_label_category_help_text')}`}
              >
                {t('resourceadm.about_resource_contact_label_category_help_text')}
              </StudioHelpText>
            </div>
          }
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={() => onLeaveTextFields({ ...contactPoint, category })}
          error={hasError}
        />
        <StudioTextfield
          label={t('resourceadm.about_resource_contact_label_email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => onLeaveTextFields({ ...contactPoint, email })}
          error={hasError}
        />
        <StudioTextfield
          label={t('resourceadm.about_resource_contact_label_telephone')}
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          onBlur={() => onLeaveTextFields({ ...contactPoint, telephone })}
          error={hasError}
        />
        <StudioTextfield
          label={t('resourceadm.about_resource_contact_label_contactpage')}
          value={contactPage}
          onChange={(e) => setContactPage(e.target.value)}
          onBlur={() => onLeaveTextFields({ ...contactPoint, contactPage })}
          error={hasError}
        />
      </StudioFieldset>
      {fieldErrors.map((error) => {
        return (
          <InputFieldErrorMessage
            key={`${error.field}-${error.index}`}
            message={t('resourceadm.about_resource_contact_point_error')}
          />
        );
      })}
    </>
  );
};
