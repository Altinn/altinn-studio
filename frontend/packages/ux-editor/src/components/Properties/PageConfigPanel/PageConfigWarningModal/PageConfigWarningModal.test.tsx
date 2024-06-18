import { render } from '@testing-library/react';
import { PageConfigWarningModal, type PageConfigWarningModalProps } from './PageConfigWarningModal';
import React from 'react';

describe('PageConfigWarningModal', () => {
  afterEach(jest.clearAllMocks);

  // TODO add tests
  it('renders correctly', () => {
    const props: PageConfigWarningModalProps = {
      modalRef: { current: document.createElement('dialog') },
    };
    render(<PageConfigWarningModal {...props} />);
  });
});
