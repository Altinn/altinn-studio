import React, { useState } from 'react';
import type { ResourceContactPoint } from 'app-shared/types/ResourceAdm';
import { Fieldset, HelpText, Textfield } from '@digdir/design-system-react';
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
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * If the error should be shown
   */
  showErrors: boolean;
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
 * @property {function}[onFocus] - Function to be executed when the field is focused
 * @property {boolean}[showErrors] - Function to be executed when leaving a text field
 * @property {boolean}[required] - Whether this field is required or not
 * @property {number}[index] - Index of fieldset
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceContactPointFieldset = ({
  contactPoint,
  onLeaveTextFields,
  onFocus,
  showErrors,
  required,
  index,
}: ResourceContactPointFieldsetProps): React.JSX.Element => {
  const { t } = useTranslation();

  const [category, setCategory] = useState(contactPoint.category);
  const [email, setEmail] = useState(contactPoint.email);
  const [telephone, setTelephone] = useState(contactPoint.telephone);
  const [contactPage, setContactPage] = useState(contactPoint.contactPage);

  const isValid = category !== '' || email !== '' || telephone !== '' || contactPage !== '';
  const hasError = !isValid && showErrors;

  return (
    <>
      <Fieldset
        legend={
          <ResourceFieldHeader
            label={t('resourceadm.about_resource_contact_legend', { index: index + 1 })}
            required={required}
          />
        }
        description={t('resourceadm.about_resource_contact_description')}
        size='small'
      >
        <Textfield
          label={
            <div className={classes.categoryHeader}>
              {t('resourceadm.about_resource_contact_label_category')}
              <HelpText
                size='small'
                title={`${t('resourceadm.about_resource_contact_label_category_help_prefix')} ${t('resourceadm.about_resource_contact_label_category_help_text')}`}
              >
                {t('resourceadm.about_resource_contact_label_category_help_text')}
              </HelpText>
            </div>
          }
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onFocus={onFocus}
          onBlur={() => onLeaveTextFields({ ...contactPoint, category })}
          error={hasError}
        />
        <Textfield
          label={t('resourceadm.about_resource_contact_label_email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={onFocus}
          onBlur={() => onLeaveTextFields({ ...contactPoint, email })}
          error={hasError}
        />
        <Textfield
          label={t('resourceadm.about_resource_contact_label_telephone')}
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          onFocus={onFocus}
          onBlur={() => onLeaveTextFields({ ...contactPoint, telephone })}
          error={hasError}
        />
        <Textfield
          label={t('resourceadm.about_resource_contact_label_contactpage')}
          value={contactPage}
          onChange={(e) => setContactPage(e.target.value)}
          onFocus={onFocus}
          onBlur={() => onLeaveTextFields({ ...contactPoint, contactPage })}
          error={hasError}
        />
      </Fieldset>
      {hasError && (
        <InputFieldErrorMessage message={t('resourceadm.about_resource_contact_point_error')} />
      )}
    </>
  );
};
