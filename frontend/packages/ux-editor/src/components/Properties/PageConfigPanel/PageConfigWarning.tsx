import React from 'react';
import { List, Link, Heading, Alert } from '@digdir/design-system-react';
import { repositoryLayoutPath } from 'app-shared/api/paths';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { getDuplicatedIds } from '../../../utils/formLayoutUtils';
import classes from './PageConfigWarning.module.css';
import type { IInternalLayout } from '../../../types/global';

type PageConfigWarningProps = {
  layout: IInternalLayout;
  selectedFormLayoutName: string;
};

export const PageConfigWarning = ({ layout, selectedFormLayoutName }: PageConfigWarningProps) => {
  const { org, app } = useStudioUrlParams();

  const duplicatedIds = getDuplicatedIds(layout)
    .map((id) => `<${id}>`)
    .join(', ');

  return (
    <div className={classes.configWarningWrapper}>
      <Alert severity='danger' className={classes.configWarningHeader}>
        <Heading size='xxsmall' level={2}>
          Du har den samme ID-en på flere komponenter
        </Heading>
      </Alert>
      <div className={classes.configWarningContent}>
        <Heading level={3} size='xxsmall' spacing>
          For å fikse problemet, må du gjøre dette:
        </Heading>
        <List.Root className={classes.configWarningList} size='small'>
          <List.Ordered>
            <List.Item>Lagre endringene i Altinn Studio med `Last opp dine endringer`.</List.Item>
            <List.Item>
              <Link href={repositoryLayoutPath(org, app, selectedFormLayoutName)} target='_blank'>
                Gå til Gitea for å endre filen med feil.
              </Link>
            </List.Item>
            <List.Item>I filen, velg blyanten øverst til høyre for å redigere filen.</List.Item>
            <List.Item>
              Finn de ID-ene som er like flere steder:
              <span className={classes.duplicatedId}> {duplicatedIds}</span>.
            </List.Item>
            <List.Item>Endre en eller flere ID-er, slik at hver av dem blir unike.</List.Item>
            <List.Item>Klikk på `Commit endringer` nederst på siden.</List.Item>
            <List.Item>
              Gå tilbake til Altinn Studio og velg `Hent endringer` for å laste inn endringene du
              har gjort i koden.
            </List.Item>
          </List.Ordered>
        </List.Root>
      </div>
    </div>
  );
};
