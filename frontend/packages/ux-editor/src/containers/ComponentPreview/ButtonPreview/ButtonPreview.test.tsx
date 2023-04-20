import React from 'react';
import { screen } from '@testing-library/react';
import { IFormButtonComponent } from '../../../types/global';
import { ButtonPreview } from './ButtonPreview';
import { ComponentType } from '../../../components';
import { appDataMock, renderWithMockStore } from '../../../testing/mocks';

describe('ButtonPreview', () => {
  test('should render "Send inn" button', () => {
    renderWithMock({
      id: 'PreviewButtonSubmit',
      textResourceBindings: {
        title: 'Send inn',
      },
      type: ComponentType.Button,
      onClickAction: () => {},
      itemType: 'COMPONENT'
    });
    expect(screen.getByRole('button', { name: 'Send inn' }));
  });

  test('should render next navigation button', () => {
    renderWithMock({
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

  test('should render back navigation button', () => {
    renderWithMock({
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

  test('Should render back and next buttons', () => {
    renderWithMock({
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

const renderWithMock = (component: IFormButtonComponent) => {
  const appData = {
    ...appDataMock,
  };
  return renderWithMockStore({ appData })(<ButtonPreview component={component} />);
};
