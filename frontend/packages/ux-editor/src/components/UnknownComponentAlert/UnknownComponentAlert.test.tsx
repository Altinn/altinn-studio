﻿import React from 'react';
import { render, screen } from '@testing-library/react';
import { UnknownComponentAlert } from './UnknownComponentAlert';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('UnknownComponentAlert', () => {
  it('should render information about unknown component', () => {
    render(<UnknownComponentAlert componentName='UnknownComponentName' />);
    expect(
      screen.getByText(
        textMock('ux_editor.edit_component.unknown_component', {
          componentName: 'UnknownComponentName',
        }),
      ),
    );
  });
});
