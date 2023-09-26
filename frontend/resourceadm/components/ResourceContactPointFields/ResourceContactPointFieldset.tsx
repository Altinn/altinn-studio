import React, { useState } from 'react';
import classes from './ResourceContactPointFields.module.css';
import type { ResourceContactPoint } from 'app-shared/types/ResourceAdm';
import { Fieldset } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { ResourceContactPointTextField } from './ResourceContactPointTextField';
import { InputFieldErrorMessage } from '../ResourcePageInputs/InputFieldErrorMessage';

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
   * If the error should be shown
   */
  showErrors: boolean;
};

/**
 * @component
 *    Displays the fieldsset with the 4 fields in a ContactPoint
 *
 * @property {ResourceContactPoint}[contactPoint] - The contact point to display in the fieldset
 * @property {function}[onLeaveTextFields] - Function to be executed when leaving a text field
 * @property {boolean}[showErrors] - Function to be executed when leaving a text field
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceContactPointFieldset = ({
  contactPoint,
  onLeaveTextFields,
  showErrors,
}: ResourceContactPointFieldsetProps): React.ReactNode => {
  const { t } = useTranslation();

  const [category, setCategory] = useState(contactPoint.category);
  const [email, setEmail] = useState(contactPoint.email);
  const [telephone, setTelephone] = useState(contactPoint.telephone);
  const [contactPage, setContactPage] = useState(contactPoint.contactPage);

  const isValid = category !== '' || email !== '' || telephone !== '' || contactPage !== '';
  const hasError = !isValid && showErrors;

  return (
    <>
      <div className={classes.divider} />
      <Fieldset
        legend={t('resourceadm.about_resource_contact_legend')}
        description={t('resourceadm.about_resource_contact_description')}
        size='small'
        className={classes.fieldset}
      >
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_category')}
          value={category}
          onChange={(value: string) => setCategory(value)}
          onBlur={() => {
            onLeaveTextFields({ ...contactPoint, category });
          }}
          isValid={!hasError}
        />
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_email')}
          value={email}
          onChange={(value: string) => setEmail(value)}
          onBlur={() => {
            onLeaveTextFields({ ...contactPoint, email });
          }}
          isValid={!hasError}
        />
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_telephone')}
          value={telephone}
          onChange={(value: string) => setTelephone(value)}
          onBlur={() => {
            onLeaveTextFields({ ...contactPoint, telephone });
          }}
          isValid={!hasError}
        />
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_contactpage')}
          value={contactPage}
          onChange={(value: string) => setContactPage(value)}
          onBlur={() => {
            onLeaveTextFields({ ...contactPoint, contactPage });
          }}
          isValid={!hasError}
        />
      </Fieldset>
      {hasError && (
        <InputFieldErrorMessage message={t('resourceadm.about_resource_contact_point_error')} />
      )}
    </>
  );
};
