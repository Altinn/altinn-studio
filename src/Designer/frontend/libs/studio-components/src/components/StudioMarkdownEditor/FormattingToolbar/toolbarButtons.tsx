import type { ReactNode } from 'react';
import { BulletListIcon, CodeIcon, FileCodeIcon, LinkIcon, NumberListIcon } from '@studio/icons';
import type { FormattingCommand } from '../types/FormattingCommand';
import classes from './FormattingToolbar.module.css';

export type ToolbarButton = Readonly<{
  command: FormattingCommand;
  icon: ReactNode;
}>;

const textIcon = (text: string, className?: string): ReactNode => (
  <span aria-hidden className={`${classes.textIcon} ${className ?? ''}`}>
    {text}
  </span>
);

export const toolbarButtonGroups: ReadonlyArray<ReadonlyArray<ToolbarButton>> = [
  [
    { command: 'bold', icon: textIcon('B', classes.boldIcon) },
    { command: 'italic', icon: textIcon('I', classes.italicIcon) },
    { command: 'strikethrough', icon: textIcon('S', classes.strikethroughIcon) },
    { command: 'inlineCode', icon: <CodeIcon aria-hidden /> },
    { command: 'link', icon: <LinkIcon aria-hidden /> },
  ],
  [
    { command: 'heading1', icon: textIcon('H1') },
    { command: 'heading2', icon: textIcon('H2') },
    { command: 'heading3', icon: textIcon('H3') },
  ],
  [
    { command: 'bulletList', icon: <BulletListIcon aria-hidden /> },
    { command: 'numberedList', icon: <NumberListIcon aria-hidden /> },
    { command: 'quote', icon: textIcon('”', classes.quoteIcon) },
    { command: 'codeBlock', icon: <FileCodeIcon aria-hidden /> },
  ],
];
