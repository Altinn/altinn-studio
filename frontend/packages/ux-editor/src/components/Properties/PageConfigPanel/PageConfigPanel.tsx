import React from 'react';
import { Accordion } from '@digdir/design-system-react';
import { FileIcon } from '@navikt/aksel-icons';
import { StudioSectionHeader } from '@studio/components';
import { useText, useTextResourcesSelector, useSelectedLayoutName } from '../../../hooks';
import { DEFAULT_LANGUAGE, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { HiddenExpressionOnLayout } from './HiddenExpressionOnLayout';
import { TextResource } from '../../TextResource/TextResource';
import { EditPageId } from './EditPageId';
import { textResourceByLanguageAndIdSelector } from '../../../selectors/textResourceSelectors';
import type { ITextResource } from 'app-shared/types/global';

export const PageConfigPanel = () => {
  const { selectedLayoutName } = useSelectedLayoutName();
  const t = useText();

  const layoutIsSelected =
    selectedLayoutName !== DEFAULT_SELECTED_LAYOUT_NAME && selectedLayoutName !== undefined;

  const layoutNameTextResourceSelector = textResourceByLanguageAndIdSelector(
    DEFAULT_LANGUAGE,
    selectedLayoutName,
  );
  const layoutNameTextResource = useTextResourcesSelector<ITextResource>(
    layoutNameTextResourceSelector,
  );
  const layoutNameText = layoutNameTextResource?.value;

  const headingTitle = !layoutIsSelected
    ? t('right_menu.content_empty')
    : layoutNameText ?? selectedLayoutName;

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
          <EditPageId layoutName={selectedLayoutName} />
          <Accordion color='subtle'>
            <Accordion.Item>
              <Accordion.Header>{t('right_menu.text')}</Accordion.Header>
              <Accordion.Content>
                <TextResource
                  handleIdChange={() => {}}
                  label={t('ux_editor.modal_properties_textResourceBindings_page_name')}
                  textResourceId={selectedLayoutName}
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
