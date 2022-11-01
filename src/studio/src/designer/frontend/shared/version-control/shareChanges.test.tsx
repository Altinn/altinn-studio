import React from 'react';
import ShareChangesComponent from './shareChanges';
import type { IShareChangesComponentProps } from './shareChanges';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

describe('shareChanges', () => {
  it('should call mock function when changes in local repo on click button', async () => {
    const handleShareChanges = jest.fn();
    render({ shareChanges: handleShareChanges });

    const shareButton = screen.getByRole('button', {
      name: /sync_header\.changes_to_share/i,
    });
    await user.click(shareButton);

    expect(handleShareChanges).toHaveBeenCalled();
  });
});

const render = (props: Partial<IShareChangesComponentProps> = {}) => {
  const allProps = {
    classes: {},
    shareChanges: jest.fn(),
    changesInLocalRepo: true,
    hasPushRight: true,
    hasMergeConflict: false,
    language: {},
    ...props,
  };

  return rtlRender(<ShareChangesComponent {...allProps} />);
};
