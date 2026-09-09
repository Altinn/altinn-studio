import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { AttachmentList } from './AttachmentList';
import type { DisplayAttachment } from './AttachmentList';

const attachments: DisplayAttachment[] = [
  {
    name: 'fil.pdf',
    baseName: 'fil',
    fileEnding: '.pdf',
    iconClass: 'reg reg-attachment',
    grouping: undefined,
    description: undefined,
    url: 'https://example.com/fil.pdf',
    dataType: 'vedlegg',
  },
];

describe('AttachmentList', () => {
  it('renders attachment names', () => {
    renderWithTranslations(
      <AttachmentList componentId='al-1' attachments={attachments} title='my.title' />,
      { overrides: { 'my.title': 'Vedlegg' } },
    );
    expect(screen.getByText('fil')).toBeInTheDocument();
    expect(screen.getByText('.pdf')).toBeInTheDocument();
  });

  it('renders the form-content wrapper for the given componentId', () => {
    renderWithTranslations(<AttachmentList componentId='al-1' attachments={attachments} />);
    expect(document.getElementById('form-content-al-1')).toBeInTheDocument();
  });

  it('renders a title when supplied', () => {
    renderWithTranslations(
      <AttachmentList componentId='al-1' attachments={attachments} title='my.title' />,
      { overrides: { 'my.title': 'Vedlegg' } },
    );
    expect(screen.getByText('Vedlegg')).toBeInTheDocument();
  });
});
