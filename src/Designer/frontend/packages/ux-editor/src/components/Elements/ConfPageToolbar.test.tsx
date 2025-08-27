import React from 'react';
import { screen } from '@testing-library/react';
import { ConfPageToolbar } from './ConfPageToolbar';
import {
  confOnScreenComponents,
  paymentLayoutComponents,
  subformLayoutComponents,
} from '../../data/formItemConfig';
import { StudioDragAndDropTree } from 'libs/studio-components-legacy/src';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ConfPageType } from './types/ConfigPageType';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';

describe('ConfPageToolbar', () => {
  it('should render', () => {
    expect(<ConfPageToolbar confPageType={'receipt'} />).toBeTruthy();
  });

  it('should render receipt component list when confPageType is receipt', () => {
    renderConfPageToolbar('receipt');
    confOnScreenComponents.forEach((component) => {
      const componentTitle = screen.getAllByText(
        textMock(`ux_editor.component_title.${component.name}`),
      );
      expect(componentTitle[0]).toBeInTheDocument();
    });
  });

  it('should not render input component when rendering ConfPageToolbar', () => {
    ['receipt', 'payment'].forEach((confPageType: 'receipt' | 'payment') => {
      renderConfPageToolbar(confPageType);
      expect(
        screen.queryByText(textMock('ux_editor.component_title.Input')),
      ).not.toBeInTheDocument();
    });
  });

  it('should render payment component list when confPageType is payment', () => {
    renderConfPageToolbar('payment');
    paymentLayoutComponents.forEach((component) => {
      const componentTitle = screen.getAllByText(
        textMock(`ux_editor.component_title.${component.name}`),
      );
      expect(componentTitle[0]).toBeInTheDocument();
    });
  });

  it('should render subform component list when confPageType is subform', () => {
    renderConfPageToolbar('subform');
    subformLayoutComponents.forEach((component) => {
      const componentTitle = screen.getAllByText(
        textMock(`ux_editor.component_title.${component.name}`),
      );
      expect(componentTitle[0]).toBeInTheDocument();
    });
  });
});

const renderConfPageToolbar = (confPageType: ConfPageType) => {
  return renderWithProviders(
    <StudioDragAndDropTree.Provider rootId='test' onAdd={jest.fn()} onMove={jest.fn()}>
      <ConfPageToolbar confPageType={confPageType} />
    </StudioDragAndDropTree.Provider>,
  );
};
