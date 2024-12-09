import React, { useState } from 'react';
import cn from 'classnames';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';
import * as StudioIcons from '@studio/icons';
import { ChevronDownIcon, ChevronUpIcon } from '@studio/icons';
import classes from './PolicyAccordion.module.css';

interface PolicyAccordion {
  icon?: string;
  title: string;
  subTitle: string;
  extraHeaderContent?: React.ReactNode;
  children: React.ReactNode;
}

export const PolicyAccordion = ({
  icon,
  title,
  subTitle,
  extraHeaderContent,
  children,
}: PolicyAccordion): React.ReactNode => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const IconComponent = StudioIcons[icon];

  return (
    <div className={classes.accordion}>
      <div className={classes.accordionHeader}>
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
