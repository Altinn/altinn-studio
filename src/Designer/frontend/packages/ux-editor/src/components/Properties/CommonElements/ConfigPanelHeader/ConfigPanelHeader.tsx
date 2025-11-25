import React from 'react';
import { StudioSectionHeader } from '@studio/components';
import classes from './ConfigPanelHeader.module.css';

export type ConfigPanelHeaderProps = {
  title: string;
  icon: React.ReactNode;
  helpText?: {
    text: string;
    title: string;
  };
};

export const ConfigPanelHeader = ({ title, icon, helpText }: ConfigPanelHeaderProps) => {
  const headerHelpText = helpText ? { text: helpText.text, title: helpText.title } : undefined;

  return (
    <StudioSectionHeader
      className={classes.sectionHeader}
      icon={icon}
      heading={{
        text: title,
        level: 2,
      }}
      helpText={headerHelpText}
    />
  );
};
