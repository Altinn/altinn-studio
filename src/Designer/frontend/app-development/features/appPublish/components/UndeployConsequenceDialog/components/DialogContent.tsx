import React from 'react';
import { consequencesDialogData } from '../consequences.data';
import { Section } from './Section';
import { ListItemWithLink } from './ListItemWithLink';
import { useTranslation } from 'react-i18next';
import { isItemWithLink } from '../utils/isItemWithLink';
import { StudioList } from '@studio/components-legacy';
import { ConfirmUndeployDialog } from '../../ConfirmUndeployDialog';

type DialogContentProps = {
  environment: string;
};

export const DialogContent = ({ environment }: DialogContentProps) => {
  const { t } = useTranslation();
  return (
    <>
      {consequencesDialogData.map((section) => (
        <Section key={section.titleKey} title={t(section.titleKey)}>
          {section.items.map((item) =>
            isItemWithLink(item) ? (
              <ListItemWithLink key={item.textKey} textKey={item.textKey} link={t(item.link)} />
            ) : (
              <StudioList.Item key={item.textKey}>{t(item.textKey)}</StudioList.Item>
            ),
          )}
        </Section>
      ))}
      <ConfirmUndeployDialog environment={environment} />
    </>
  );
};
