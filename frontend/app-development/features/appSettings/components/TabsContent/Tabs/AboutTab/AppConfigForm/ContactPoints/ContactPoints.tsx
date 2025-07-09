import React, { useState } from 'react';
import type { ReactElement } from 'react';
import classes from './ContactPoints.module.css';
import type { ContactPoint } from 'app-shared/types/AppConfig';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { ContactPointCard } from './ContactPointCard';
import { PlusIcon } from '@studio/icons';

const emptyContactPoint: ContactPoint = {
  email: '',
  category: '',
  telephone: '',
  contactPage: '',
};

type ContactPointCommonProps = {
  contactPointList: ContactPoint[];
  errors: AppConfigFormError[];
  id: string;
};

export type ContactPointsProps = {
  onContactPointsChanged: (contactPoints: ContactPoint[]) => void;
} & ContactPointCommonProps;

export function ContactPoints({
  contactPointList,
  onContactPointsChanged,
  errors,
  id,
}: ContactPointsProps): ReactElement {
  const { t } = useTranslation();

  const [listItems, setListItems] = useState<ContactPoint[]>(
    contactPointList?.length ? contactPointList : [emptyContactPoint],
  );

  const handleClickAddButton = () => {
    const updatedList: ContactPoint[] = [...listItems, emptyContactPoint];
    setListItems(updatedList);
    onContactPointsChanged(updatedList);
  };

  const handleClickRemoveButton = (deleteId: number) => {
    const updatedList: ContactPoint[] = listItems.filter((_item, index) => index !== deleteId);
    setListItems(updatedList);
    onContactPointsChanged(updatedList);
  };

  const onChangeContactPointField = (listItem: ContactPoint, pos: number) => {
    const updatedList: ContactPoint[] = [...listItems];
    updatedList[pos] = listItem;
    setListItems(updatedList);
    onContactPointsChanged(updatedList);
  };

  return (
    <div className={classes.contactPoints}>
      <ContactPointFields
        contactPointList={listItems}
        onRemoveContactPoint={handleClickRemoveButton}
        onChangeContactPoint={onChangeContactPointField}
        id={id}
        errors={errors}
      />
      <div>
        <StudioButton
          variant='secondary'
          icon={<PlusIcon />}
          iconPlacement='left'
          onClick={handleClickAddButton}
        >
          {t('app_settings.about_tab_contact_point_add_button_text')}
        </StudioButton>
      </div>
    </div>
  );
}

type ContactPointFieldsProps = {
  onRemoveContactPoint: (index: number) => void;
  onChangeContactPoint: (contactPoint: ContactPoint, index: number) => void;
} & ContactPointCommonProps;

function ContactPointFields({
  contactPointList,
  onRemoveContactPoint,
  onChangeContactPoint,
  id,
  errors,
}: ContactPointFieldsProps): ReactElement[] {
  return contactPointList.map((contactPoint: ContactPoint, position: number) => (
    <div key={`${position}/${contactPointList.length}`}>
      <ContactPointCard
        contactPoint={contactPoint}
        onContactPointsChanged={(updatedContactPoint: ContactPoint) =>
          onChangeContactPoint(updatedContactPoint, position)
        }
        errors={errors}
        index={position}
        id={`${id}-${position}`}
        onRemoveButtonClick={contactPointList.length > 1 ? onRemoveContactPoint : undefined}
      />
    </div>
  ));
}
