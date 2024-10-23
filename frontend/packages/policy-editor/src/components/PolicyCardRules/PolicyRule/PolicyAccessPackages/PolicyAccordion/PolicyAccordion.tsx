import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { Tag } from '@digdir/designsystemet-react';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';
import * as StudioIcons from '@studio/icons';
import { ChevronDownIcon, ChevronUpIcon } from '@studio/icons';
import classes from './PolicyAccordion.module.css';

interface PolicyAccordion {
  icon?: string;
  title: string;
  subTitle: string;
  selectedCount?: number;
  extraHeaderContent?: React.ReactNode;
  children: React.ReactNode;
}

export const PolicyAccordion = ({
  icon,
  title,
  subTitle,
  selectedCount,
  extraHeaderContent,
  children,
}: PolicyAccordion): React.ReactNode => {
  const { t } = useTranslation();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const IconComponent = StudioIcons[icon];

  return (
    <div className={classes.accordion}>
      <div
        className={cn(
          classes.accordionHeader,
          selectedCount > 0 ? classes.selectedAccordionHeader : '',
        )}
      >
        <StudioButton
          fullWidth
          variant='tertiary'
          aria-expanded={isExpanded ? 'true' : 'false'}
          onClick={() => setIsExpanded((oldIsExpanded) => !oldIsExpanded)}
        >
          <div className={classes.accordionButton}>
            {icon && Object.keys(StudioIcons).includes(icon) && (
              <IconComponent
                className={cn(classes.accordionIcon, classes.iconContainer)}
                aria-hidden
              />
            )}
            <div className={classes.accordionTitle}>
              <StudioLabelAsParagraph size='sm'>{title}</StudioLabelAsParagraph>
              <div className={classes.accordionSubTitle}>{subTitle}</div>
            </div>
            {selectedCount > 0 && (
              <Tag size='sm' color='neutral'>
                {selectedCount}
                <div className={classes.visuallyHidden}>
                  {' '}
                  {t('policy_editor.access_package_selected_count')}
                </div>
              </Tag>
            )}
          </div>
          {isExpanded ? (
            <ChevronUpIcon className={classes.accordionIcon} aria-hidden />
          ) : (
            <ChevronDownIcon className={classes.accordionIcon} aria-hidden />
          )}
        </StudioButton>
        {extraHeaderContent}
      </div>
      {isExpanded && <div className={classes.accordionContent}>{children}</div>}
    </div>
  );
};
