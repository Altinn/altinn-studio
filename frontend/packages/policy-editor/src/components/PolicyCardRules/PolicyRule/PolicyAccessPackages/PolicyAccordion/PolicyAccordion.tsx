import React, { useState } from 'react';
import cn from 'classnames';
import { Label, Tag } from '@digdir/designsystemet-react';
import { StudioButton } from '@studio/components';
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
              <IconComponent className={cn(classes.accordionIcon, classes.iconContainer)} />
            )}
            <div className={classes.accordionTitle}>
              <Label size='sm'>{title}</Label>
              <div>{subTitle}</div>
            </div>
            {selectedCount > 0 && (
              <Tag size='sm' color='neutral'>
                {selectedCount}
              </Tag>
            )}
          </div>
          {isExpanded ? (
            <ChevronUpIcon className={classes.accordionIcon} />
          ) : (
            <ChevronDownIcon className={classes.accordionIcon} />
          )}
        </StudioButton>
        {extraHeaderContent}
      </div>
      {isExpanded && <div className={classes.accordionContent}>{children}</div>}
    </div>
  );
};
