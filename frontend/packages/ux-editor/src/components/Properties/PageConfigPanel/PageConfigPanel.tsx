import React from 'react';
import { Accordion, List, Link, Heading, Alert } from '@digdir/design-system-react';
import { FileIcon } from '@navikt/aksel-icons';
import { StudioSectionHeader } from '@studio/components';
import { useText, useTextResourcesSelector, useAppContext, useFormLayouts } from '../../../hooks';
import { DEFAULT_LANGUAGE, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { HiddenExpressionOnLayout } from './HiddenExpressionOnLayout';
import { TextResource } from '../../TextResource/TextResource';
import { EditPageId } from './EditPageId';
import { textResourceByLanguageAndIdSelector } from '../../../selectors/textResourceSelectors';
import type { ITextResource } from 'app-shared/types/global';
import { haveComponentsUniqueIds, getDuplicatedIds } from '../../../utils/formLayoutUtils';
import classes from './PageConfigPanel.module.css';
import { repositoryLayoutPath } from 'app-shared/api/paths';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const PageConfigPanel = () => {
  const { selectedFormLayoutName } = useAppContext();
  const t = useText();
  const { org, app } = useStudioUrlParams();
  const layoutIsSelected =
    selectedFormLayoutName !== DEFAULT_SELECTED_LAYOUT_NAME && selectedFormLayoutName !== undefined;

  // check if the layout has duplicated ids and show a warning if it does
  const layout = useFormLayouts()[selectedFormLayoutName];
  const hasDuplicatedIds = !haveComponentsUniqueIds(layout);

  const layoutNameTextResourceSelector = textResourceByLanguageAndIdSelector(
    DEFAULT_LANGUAGE,
    selectedFormLayoutName,
  );
  const layoutNameTextResource = useTextResourcesSelector<ITextResource>(
    layoutNameTextResourceSelector,
  );
  const layoutNameText = layoutNameTextResource?.value;

  const headingTitle = !layoutIsSelected
    ? t('right_menu.content_empty')
    : layoutNameText ?? selectedFormLayoutName;

  if (layoutIsSelected && hasDuplicatedIds) {
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
          <List.Root className={classes.configWarningList}>
            <List.Ordered>
              <List.Item>Lagre endringene i Altinn Studio med `Last opp dine endringer`.</List.Item>
              <List.Item>
                <Link href={repositoryLayoutPath(org, app, selectedFormLayoutName)}>
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
  }

  return (
    <>
      <StudioSectionHeader
        icon={<FileIcon />}
        heading={{
          text: headingTitle,
          level: 2,
        }}
      />
      {layoutIsSelected && (
        <>
          <EditPageId layoutName={selectedFormLayoutName} />
          <Accordion color='subtle'>
            <Accordion.Item>
              <Accordion.Header>{t('right_menu.text')}</Accordion.Header>
              <Accordion.Content>
                <TextResource
                  handleIdChange={() => {}}
                  label={t('ux_editor.modal_properties_textResourceBindings_page_name')}
                  textResourceId={selectedFormLayoutName}
                />
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>{t('right_menu.dynamics')}</Accordion.Header>
              <Accordion.Content>
                <HiddenExpressionOnLayout />
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </>
      )}
    </>
  );
};
