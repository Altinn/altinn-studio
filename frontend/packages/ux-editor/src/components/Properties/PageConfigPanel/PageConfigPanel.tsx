import React from 'react';
import { Accordion } from '@digdir/design-system-react';
import { FileIcon } from '@navikt/aksel-icons';
import { StudioSectionHeader } from '@studio/components';
import { useText, useTextResourcesSelector } from '../../../hooks';
import { DEFAULT_LANGUAGE, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { HiddenExpressionOnLayout } from './HiddenExpressionOnLayout';
import { TextResource } from '../../TextResource/TextResource';
import { EditPageId } from './EditPageId';
import { textResourceByLanguageAndIdSelector } from '../../../selectors/textResourceSelectors';
import type { ITextResource } from 'app-shared/types/global';
import { useAppContext } from '../../../hooks/useAppContext';

export const PageConfigPanel = () => {
  const { selectedLayout: layoutName } = useAppContext();
  const t = useText();

  const layoutIsSelected = layoutName !== DEFAULT_SELECTED_LAYOUT_NAME && layoutName !== undefined;

  const layoutNameTextResourceSelector = textResourceByLanguageAndIdSelector(
    DEFAULT_LANGUAGE,
    layoutName,
  );
  const layoutNameTextResource = useTextResourcesSelector<ITextResource>(
    layoutNameTextResourceSelector,
  );
  const layoutNameText = layoutNameTextResource?.value;

  const headingTitle = !layoutIsSelected
    ? t('right_menu.content_empty')
    : layoutNameText ?? layoutName;

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
          <EditPageId layoutName={layoutName} />
          <Accordion color='subtle'>
            <Accordion.Item>
              <Accordion.Header>{t('right_menu.text')}</Accordion.Header>
              <Accordion.Content>
                <TextResource
                  handleIdChange={() => {}}
                  label={t('ux_editor.modal_properties_textResourceBindings_page_name')}
                  textResourceId={layoutName}
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
