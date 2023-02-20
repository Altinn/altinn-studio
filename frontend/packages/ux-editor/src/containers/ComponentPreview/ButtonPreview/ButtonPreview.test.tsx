import React from 'react';
import { screen } from '@testing-library/react';
import { IFormButtonComponent } from '../../../types/global';
import { ButtonPreview } from './ButtonPreview';
import { ComponentTypes } from '../../../components';
import { appDataMock, renderWithMockStore } from '../../../testing/mocks';

// Test 1, tests if a button "Send inn" renders.
describe('ButtonPreview', () => {
  test('should render "Send inn" button', () => {
    renderWithMock({
      id: 'PreviewButtonSubmit',
      textResourceBindings: {
        title: 'Send inn',
      },
      type: ComponentTypes.Button,
      onClickAction: () => {},
    });
    expect(screen.getByRole('button', { name: 'Send inn' }));
  });

// Test 2, tests if a button "next" renders.
  test('should render next navigation button', () => {
    renderWithMock({
      id: 'PreviewNavigationButton',
      textResourceBindings: {
        next: 'next',
        back: 'back',
      },
      showBackButton: false,
      type: ComponentTypes.NavigationButtons,
      onClickAction: () => {},
    });
    expect(screen.getByRole('button', { name: 'next' }));
  });

// Test 3, tests if a button "Back" renders.
  test('should render back navigation button', () => {
    renderWithMock({
      id: 'PreviewNavigationButton',
      textResourceBindings: {
        next: 'next',
        back: 'back',
      },
      showBackButton: true,
      type: ComponentTypes.NavigationButtons,
      onClickAction: () => {},
    });
    expect(screen.getByRole('button', { name: 'back' }));
  });

  // Test 4, tests if the tow buttons "Back" and "Next" render together.
  test("Should render back and next buttons", () => {
    renderWithMock({
      id:"PreviewNavigationButton",
      textResourceBindings: {
        next: "next",
        back: "back",
      },
      showBackButton: true,
      showNextButton: true,
      type: ComponentTypes.NavigationButtons,
      onClickAction: () => {},
    });
    expect(screen.getByRole("button", { name: "back" }));
    expect(screen.getByRole("button", { name: "next" }));
  })
});

//  Returns a rendered component with mock data from the appDataMock object.
const renderWithMock = (component: IFormButtonComponent) => {
  const appData = {
    ...appDataMock,
  };
//  Render the component with a mock store.
  return renderWithMockStore({ appData })(<ButtonPreview component={component} />);
};

