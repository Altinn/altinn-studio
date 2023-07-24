import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { ButtonPreview } from './ButtonPreview';
import { ComponentType } from 'app-shared/types/ComponentType';
import { renderHookWithMockStore, renderWithMockStore } from '../../../testing/mocks';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { ITextResource } from 'app-shared/types/global';
import type { FormButtonComponent } from '../../../types/FormComponent';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

// Test data:
const org = 'org';
const app = 'app';
const sendInnKey = 'sendinn';
const sendInnText = 'Send inn';
const sendInnTextResource: ITextResource = { id: sendInnKey, value: sendInnText };
const backKey = 'back';
const backText = 'Back';
const backTextResource: ITextResource = { id: backKey, value: backText };
const nextKey = 'next';
const nextText = 'Next';
const nextTextResource: ITextResource = { id: nextKey, value: nextText };
const nbTextResources: ITextResource[] = [sendInnTextResource, backTextResource, nextTextResource];

describe('ButtonPreview', () => {
  describe('Submit button', () => {
    const submitButton: FormButtonComponent = {
      id: 'PreviewButtonSubmit',
      textResourceBindings: {
        title: sendInnKey,
      },
      type: ComponentType.Button,
      onClickAction: () => {},
      itemType: 'COMPONENT',
      dataModelBindings: {},
    };

    test('should render "Send inn" button', async () => {
      await renderWithMock(submitButton);
      expect(screen.getByRole('button', { name: sendInnText }));
    });

    test('Should render "Send inn" button with a default value when the text resource is empty', async () => {
      await renderWithMock({
        ...submitButton,
        textResourceBindings: {
          title: undefined,
        },
      });
      expect(screen.getByRole('button', { name: textMock('ux_editor.modal_properties_button_type_submit') }));
    });
  });

  describe('Navigation buttons', () => {
    const navigationButtons: FormButtonComponent = {
      id: 'PreviewNavigationButton',
      textResourceBindings: {
        next: nextKey,
        back: backKey,
      },
      showBackButton: true,
      type: ComponentType.NavigationButtons,
      onClickAction: () => {},
      itemType: 'COMPONENT',
      dataModelBindings: {},
    };

    test('should render next navigation button', async () => {
      await renderWithMock({
        ...navigationButtons,
        showBackButton: false,
      });
      expect(screen.getByRole('button', { name: nextText }));
    });

    test('should render back navigation button', async () => {
      await renderWithMock(navigationButtons);
      expect(screen.getByRole('button', { name: backText }));
    });

    test('Should render back and next buttons', async () => {
      await renderWithMock(navigationButtons);
      expect(screen.getByRole('button', { name: nextText }));
      expect(screen.getByRole('button', { name: backText }));
    });

    test('Should render back and next buttons with a default value when the text resource is empty', async () => {
      await renderWithMock({
        ...navigationButtons,
        textResourceBindings: {
          next: undefined,
          back: undefined,
        },
      });
      expect(screen.getByRole('button', { name: textMock('ux_editor.modal_properties_button_type_back') }));
      expect(screen.getByRole('button', { name: textMock('ux_editor.modal_properties_button_type_next') }));
    });
  });
});

const renderWithMock = async (component: FormButtonComponent) => {

  const { result: texts } = renderHookWithMockStore({}, {
    getTextResources: () => Promise.resolve({ language: 'nb', resources: nbTextResources })
  })(() => useTextResourcesQuery(org, app)).renderHookResult;
  await waitFor(() => expect(texts.current.isSuccess).toBe(true));

  return renderWithMockStore()(<ButtonPreview component={component} />);
};
