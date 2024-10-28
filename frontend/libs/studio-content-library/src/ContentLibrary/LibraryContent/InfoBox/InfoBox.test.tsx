import React from 'react';
import { InfoBox } from './InfoBox';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { PageName } from '../../../types/PageName';
import { infoBoxConfigs } from './infoBoxConfigs';

const pageNameMock: PageName = 'codeList';

describe('InfoBox', () => {
  it('renders the infobox illustration, title and description', () => {
    renderInfoBox();
    const infoBoxIllustration = screen.getByRole('img', {
      name: textMock(infoBoxConfigs[pageNameMock].titleTextKey),
    });
    const infoBoxTitle = screen.getByText(textMock(infoBoxConfigs[pageNameMock].titleTextKey));
    const infoBoxDescription = screen.getByText(
      textMock(infoBoxConfigs[pageNameMock].descriptionTextKey),
    );
    expect(infoBoxIllustration).toBeInTheDocument();
    expect(infoBoxTitle).toBeInTheDocument();
    expect(infoBoxDescription).toBeInTheDocument();
  });

  it('renders nothing if receiving a pageName that has no member in infoBoxConfigs', () => {
    renderInfoBox('landingPage');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});

const renderInfoBox = (pageName: PageName = pageNameMock) => {
  render(<InfoBox pageName={pageName} />);
};
