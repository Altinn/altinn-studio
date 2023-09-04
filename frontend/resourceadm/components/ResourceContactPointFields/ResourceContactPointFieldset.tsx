import React from 'react';
import classes from './ResourceContactPointFields.module.css';
import type { ResourceContactPoint } from 'app-shared/types/ResourceAdm';
import { Fieldset, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { ResourceContactPointTextField } from './ResourceContactPointTextField';

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

  return (
    <>
      <div className={classes.divider} />
      <Fieldset
        legend={t('resourceadm.about_resource_contact_legend')}
        className={classes.fieldset}
      >
        <Paragraph size='small' as='span'>
          {t('resourceadm.about_resource_contact_description')}
        </Paragraph>
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_category')}
          value={contactPoint.category}
          onBlur={(value: string) => {
            onLeaveTextFields({ ...contactPoint, category: value });
          }}
          showErrors={showErrors}
          errorMessage={t('resourceadm.about_resource_contact_error_category')}
        />
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_email')}
          value={contactPoint.email}
          onBlur={(value: string) => {
            onLeaveTextFields({ ...contactPoint, email: value });
          }}
          showErrors={showErrors}
          errorMessage={t('resourceadm.about_resource_contact_error_email')}
        />
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_telephone')}
          value={contactPoint.telephone}
          onBlur={(value: string) => {
            onLeaveTextFields({ ...contactPoint, telephone: value });
          }}
          showErrors={showErrors}
          errorMessage={t('resourceadm.about_resource_contact_error_telephone')}
        />
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_contactpage')}
          value={contactPoint.contactPage}
          onBlur={(value: string) => {
            onLeaveTextFields({ ...contactPoint, contactPage: value });
          }}
          showErrors={showErrors}
          errorMessage={t('resourceadm.about_resource_contact_error_contactpage')}
        />
      </Fieldset>
    </>
  );
};
