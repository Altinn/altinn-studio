import { Card } from '@digdir/designsystemet-react';
import type { MouseEventHandler } from 'react';
import React from 'react';
import { StudioTag } from '../StudioTag';
import classes from './StudioLibraryElement.module.css';
import { CheckmarkCircleIcon } from '@studio/icons';
import cn from 'classnames';

export type StudioLibraryElementProps = {
  readonly href: string;
  readonly latestPublishedVersion: string | null;
  readonly name: string | null;
  readonly onClick: MouseEventHandler<HTMLAnchorElement>;
  readonly texts: StudioLibraryElementTexts;
  readonly info?: string;
};

export type StudioLibraryElementTexts = {
  readonly published: string;
  readonly unnamed: string;
  readonly version: (version: string) => string;
};

export function StudioLibraryElement({
  href,
  info,
  latestPublishedVersion,
  name,
  onClick,
  texts,
}: StudioLibraryElementProps): React.ReactElement {
  return (
    <Card asChild>
      <a href={href} onClick={onClick} className={classes.anchor}>
        <span className={classes.header}>
          <Name name={name} unnamedText={texts.unnamed} />
          <PublishedTag text={texts.published} version={latestPublishedVersion} />
        </span>
        <span className={classes.details}>
          <Version latestPublishedVersion={latestPublishedVersion} text={texts.version} />
          <Info info={info} />
        </span>
      </a>
    </Card>
  );
}

type NameProps = {
  readonly name: string | null;
  readonly unnamedText: string;
};

function Name({ name, unnamedText }: NameProps): React.ReactElement {
  return <span className={cn(classes.name, !name && classes.unnamed)}>{name || unnamedText}</span>;
}

type PublishedTagProps = {
  readonly text: string;
  readonly version: string | null;
};

function PublishedTag({ text, version }: PublishedTagProps): React.ReactNode {
  if (!version) return null;
  else
    return (
      <StudioTag data-color='success'>
        <CheckmarkCircleIcon />
        {text}
      </StudioTag>
    );
}

type VersionProps = {
  readonly latestPublishedVersion: string | null;
  readonly text: (version: string) => string;
};

function Version({ latestPublishedVersion, text }: VersionProps): React.ReactNode {
  if (!latestPublishedVersion) return null;
  else return <span>{text(latestPublishedVersion)}</span>;
}

type InfoProps = {
  readonly info?: string;
};

function Info({ info }: InfoProps): React.ReactNode {
  if (!info) return null;
  else return <span>{info}</span>;
}
