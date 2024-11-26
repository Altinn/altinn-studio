import React, { type ComponentType, type ReactElement, type ReactNode } from 'react';
import { Heading, Link, Paragraph } from '@digdir/designsystemet-react';
import { type IconProps } from '@studio/icons';
import classes from './ContactSection.module.css';

export type ContactSectionProps = {
  title: string;
  description: string;
  link: {
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
        <Heading level={2} size='xsmall' spacing>
          {title}
        </Heading>
        <Paragraph spacing>{description}</Paragraph>
        {additionalContent && <span>{additionalContent}</span>}
        <Link href={link.href}>{link.name}</Link>
      </div>
    </section>
  );
};
