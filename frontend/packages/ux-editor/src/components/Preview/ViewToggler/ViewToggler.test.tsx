import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

import { ViewToggler } from './ViewToggler';

describe('ViewToggler', () => {
  it('should render desktop view as default', () => {
    render(<ViewToggler onChange={() => {}} />);

    const switchButton = screen.getByRole('checkbox', {
      name: textMock('ux_editor.mobilePreview'),
    });
    expect(switchButton).not.toBeChecked();
  });

  it('should render mobile view when initialView is mobile', () => {
    render(<ViewToggler initialView='mobile' onChange={() => {}} />);

    const switchButton = screen.getByRole('checkbox', {
      name: textMock('ux_editor.mobilePreview'),
    });

    expect(switchButton).toBeChecked();
  });

  it('should emit onChange with value "mobile" or "desktop" when toggled', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();
    render(<ViewToggler onChange={onChangeMock} />);

    const switchButton = screen.getByRole('checkbox', {
      name: textMock('ux_editor.mobilePreview'),
    });

    await user.click(switchButton);
    expect(onChangeMock).toHaveBeenCalledWith('mobile');

    await user.click(switchButton);
    expect(onChangeMock).toHaveBeenCalledWith('desktop');
  });
});
