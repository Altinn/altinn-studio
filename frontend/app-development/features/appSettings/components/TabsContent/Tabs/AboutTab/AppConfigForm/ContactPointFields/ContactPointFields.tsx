import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { ContactPoint } from 'app-shared/types/AppConfig';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import { StudioCard, StudioFieldset, StudioTag, StudioTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { ContactPointCard } from './ContactPointCard';

const emptyContactPoint: ContactPoint = {
  email: '',
  category: '',
  telephone: '',
  contactPage: '',
};

export type ContactPointFieldsProps = {
  contactPointList: ContactPoint[];
  onContactPointsChanged: (contactPoints: ContactPoint[]) => void;
  errors: AppConfigFormError[];
  required?: boolean;
  id: string;
};

export function ContactPointFields({
  contactPointList,
  onContactPointsChanged,
  errors,
  required = false,
  id,
}: ContactPointFieldsProps): ReactElement {
  //  return TODO Wrap all fields
  //  Need
  //    - Delete button
  //    - Add button
  //    - Add empty fieldset for new contact point
  //    - Logic for error message

  return (
    <ContactPointCard
      contactPoint={emptyContactPoint}
      onContactPointsChanged={() => {}}
      errors={errors}
      required={required}
      index={0}
      id={id}
    />
  );
}

type ContactPointFieldsWrapperProps = {};

function ContactPointFieldsWrapper({}: ContactPointFieldsWrapperProps): ReactElement {
  const { t } = useTranslation();

  return <div></div>;
}
