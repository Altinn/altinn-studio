import React from 'react';
import { LinkIcon } from '@studio/icons';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';

type DefinedLayoutSetProps = {
  existingLayoutSetForSubForm: string;
  onClick: () => void;
};

export const DefinedLayoutSet = ({
  existingLayoutSetForSubForm,
  onClick,
}: DefinedLayoutSetProps) => {
  const { t } = useTranslation();

  const value = (
    <span>
      <LinkIcon /> <span>{existingLayoutSetForSubForm}</span>
    </span>
  );

  return (
    <StudioProperty.Button
      aria-label={'title'}
      onClick={onClick}
      property={t('some label')}
      title={t('some title')}
      value={value}
    />
  );
};
