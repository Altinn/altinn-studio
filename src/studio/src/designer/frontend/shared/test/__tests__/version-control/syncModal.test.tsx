import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import SyncModalComponent from '../../../version-control/syncModal';

jest.mock('react-truncate-markup');

describe('>>> components/base/syncModal.tsx --- Snapshot', () => {
  let mockAnchorEl: any;
  let mockHeader: string;
  let mockDescriptionText: string[];
  let mockIsLoading: boolean;
  let mockShouldShowDoneIcon: boolean;
  let mockBtnText: string;
  let mockShouldShowCommitBox: boolean;
  let mockHandleClose: any;
  let mockBtnClick: any;

  beforeEach(() => {
    mockAnchorEl = null;
    mockHeader = 'Header text';
    mockDescriptionText = ['Description text'];
    mockIsLoading = false;
    mockShouldShowDoneIcon = false;
    mockBtnText = 'Btn text';
    mockShouldShowCommitBox = false;
    mockHandleClose = jest.fn();
    mockBtnClick = jest.fn();
  });

  it('+++ Should match snapshot when anchor element is null', () => {
    const rendered = renderer.create(
      <SyncModalComponent
        anchorEl={mockAnchorEl}
        header={mockHeader}
        descriptionText={mockDescriptionText}
        isLoading={mockIsLoading}
        shouldShowDoneIcon={mockShouldShowDoneIcon}
        btnText={mockBtnText}
        shouldShowCommitBox={mockShouldShowCommitBox}
        handleClose={mockHandleClose}
        btnClick={mockBtnClick}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
});
