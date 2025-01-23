import React from 'react';
import { consequencesDialogData } from '../consequences.data';
import { Section } from './Section';
import { ListItemWithLink } from './ListItemWithLink';
import { useTranslation } from 'react-i18next';
import { isItemWithLink } from '../utils/isItemWithLink';
import { StudioList } from '@studio/components';
import { ConfirmUndeployDialog } from '../../Deploy/ConfirmUndeployDialog';

export const DialogContent = () => {
  const { t } = useTranslation();
  return (
    <>
      {consequencesDialogData.map((section) => (
        <Section key={section.titleKey} title={t(section.titleKey)}>
          {section.items.map((item) =>
            isItemWithLink(item) ? (
              <ListItemWithLink key={item.textKey} textKey={item.textKey} link={item.link} />
            ) : (
              <StudioList.Item key={item.textKey}>{t(item.textKey)}</StudioList.Item>
            ),
          )}
        </Section>
      ))}
      <ConfirmUndeployDialog />
    </>
  );
};
