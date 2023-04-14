import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { IFormButtonComponent } from '../../../types/global';
import { ButtonPreview } from './ButtonPreview';
import { ComponentType } from '../../../components';
import { renderHookWithMockStore, renderWithMockStore } from '../../../testing/mocks';
import { useTextResourcesQuery } from '../../../hooks/queries/useTextResourcesQuery';
import { ITextResource } from 'app-shared/types/global';

// Test data:
const org = 'org';
const app = 'app';
const sendInnKey = 'sendinn';
const sendInnText = 'Send inn';
const sendInnTextResource: ITextResource = { id: sendInnKey, value: sendInnText };
const nbTextResources: ITextResource[] = [sendInnTextResource];

describe('ButtonPreview', () => {
  test('should render "Send inn" button', async () => {
    await renderWithMock({
      id: 'PreviewButtonSubmit',
      textResourceBindings: {
        title: sendInnKey,
      },
      type: ComponentType.Button,
      onClickAction: () => {},
      itemType: 'COMPONENT'
    });
    expect(screen.getByRole('button', { name: sendInnText }));
  });

  test('should render next navigation button', async () => {
    await renderWithMock({
      id: 'PreviewNavigationButton',
      textResourceBindings: {
        next: 'next',
        back: 'back',
      },
      showBackButton: false,
      type: ComponentType.NavigationButtons,
      onClickAction: () => {},
      itemType: 'COMPONENT'
    });
    expect(screen.getByRole('button', { name: 'next' }));
  });

  test('should render back navigation button', async () => {
    await renderWithMock({
      id: 'PreviewNavigationButton',
      textResourceBindings: {
        next: 'next',
        back: 'back',
      },
      showBackButton: true,
      type: ComponentType.NavigationButtons,
      onClickAction: () => {},
      itemType: 'COMPONENT'
    });
    expect(screen.getByRole('button', { name: 'back' }));
  });

  test('Should render back and next buttons', async () => {
    await renderWithMock({
      id: 'PreviewNavigationButton',
      textResourceBindings: {
        next: 'next',
        back: 'back',
      },
      showBackButton: true,
      type: ComponentType.NavigationButtons,
      onClickAction: () => {},
      itemType: 'COMPONENT'
    });
    expect(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByRole('button', { name: 'next' }));
  });
});

const renderWithMock = async (component: IFormButtonComponent) => {

  const { result: texts } = renderHookWithMockStore({}, {
    getTextResources: () => Promise.resolve({ language: 'nb', resources: nbTextResources })
  })(() => useTextResourcesQuery(org, app)).renderHookResult;
  await waitFor(() => expect(texts.current.isSuccess).toBe(true));

  return renderWithMockStore()(<ButtonPreview component={component} />);
};
