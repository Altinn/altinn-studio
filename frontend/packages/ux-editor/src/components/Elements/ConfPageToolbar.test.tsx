import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConfPageToolbar } from './ConfPageToolbar';
import { confOnScreenComponents, paymentLayoutComponents } from '../../data/formItemConfig';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('ConfPageToolbar', () => {
  it('should render', () => {
    expect(<ConfPageToolbar confPageType={'receipt'} />).toBeTruthy();
  });

  it('should render receipt component list when confPageType is receipt', () => {
    renderConfPageToolbar('receipt');
    confOnScreenComponents.forEach((component) => {
      const componentTitle = `ux_editor.component_title.${component.name}`;
      expect(screen.getByText(textMock(componentTitle))).toBeInTheDocument();
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
      const componentTitle = `ux_editor.component_title.${component.name}`;
      expect(screen.getByText(textMock(componentTitle))).toBeInTheDocument();
    });
  });
});

const renderConfPageToolbar = (confPageType: 'receipt' | 'payment') => {
  return render(
    <DragAndDropTree.Provider rootId='test' onAdd={jest.fn()} onMove={jest.fn()}>
      <ConfPageToolbar confPageType={confPageType} />
    </DragAndDropTree.Provider>,
  );
};
