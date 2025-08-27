import React, { type ComponentType, type ReactElement, type ReactNode } from 'react';
import { StudioHeading, StudioLink } from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import { type IconProps } from '@studio/icons';
import classes from './ContactSection.module.css';

export type ContactSectionProps = {
  title: string;
  description: string;
  link?: {
    name: string;
    href: string;
  };
  Icon: ComponentType<IconProps>;
  additionalContent?: ReactNode;
};
export const ContactSection = ({
  title,
  description,
  link,
  Icon,
  additionalContent,
}: ContactSectionProps): ReactElement => {
  return (
    <section className={classes.section}>
      <div className={classes.iconContainer}>
        <Icon className={classes.icon} title={title} aria-hidden />
      </div>
      <div className={classes.textContainer}>
        <StudioHeading level={2} size='xs' spacing>
          {title}
        </StudioHeading>
        <StudioParagraph spacing data-size='md'>
          {description}
        </StudioParagraph>
        {additionalContent && <span>{additionalContent}</span>}
        {link && <StudioLink href={link.href}>{link.name}</StudioLink>}
      </div>
    </section>
  );
};
