import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import VersionControlHeader from '../../src/version-control/versionControlHeader';

describe('>>> components/base/versionControlHeader.tsx --- Snapshot', () => {
  let mockLanguage: any;

  beforeEach(() => {
    mockLanguage = {};
  });

  it('+++ Should match snapshot', () => {
    const rendered = renderer.create(
      <VersionControlHeader
        language={mockLanguage}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
});
