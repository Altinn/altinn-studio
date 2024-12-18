import React, { type ReactNode, useId, useState } from 'react';
import cn from 'classnames';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';
import * as StudioIcons from '@studio/icons';
import classes from './PolicyAccordion.module.css';

interface PolicyAccordion {
  icon?: string;
  title: string;
  subTitle: string;
  extraHeaderContent?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export const PolicyAccordion = ({
  icon,
  title,
  subTitle,
  extraHeaderContent,
  defaultOpen,
  children,
}: PolicyAccordion): ReactNode => {
  const contentId = useId();
  const initialExpandedState: boolean = defaultOpen || false;
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpandedState);
  const IconComponent = StudioIcons[icon];

  return (
    <div className={classes.accordion}>
      <div className={classes.accordionHeader}>
        <StudioButton
          fullWidth
          variant='tertiary'
          aria-expanded={isExpanded ? 'true' : 'false'}
          aria-controls={contentId}
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
          <PolicyAccordionIcon isExpanded={isExpanded} />
        </StudioButton>
        {extraHeaderContent}
      </div>
      {isExpanded && (
        <div id={contentId} className={classes.accordionContent}>
          {children}
        </div>
      )}
    </div>
  );
};

const PolicyAccordionIcon = ({ isExpanded }: { isExpanded: boolean }): ReactNode => {
  const IconComponent = isExpanded ? StudioIcons.ChevronUpIcon : StudioIcons.ChevronDownIcon;
  return <IconComponent className={classes.accordionIcon} aria-hidden />;
};
