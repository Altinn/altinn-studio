import { render, screen } from '@testing-library/react';
import { AppMetricPlaceholder } from './AppMetricPlaceholder';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { AppMetric } from 'admin/features/apps/types/metrics/AppMetric';
import { altinnDocsUrl } from 'app-shared/ext-urls';

jest.mock('react-chartjs-2');

const metricName = 'altinn_app_lib_processes_started';

const defaultMetric: AppMetric = {
  name: metricName,
  timestamps: [],
  counts: [],
  bucketSize: 5,
  logsUrl: '',
};

const defaultProps = {
  range: 5,
  metric: defaultMetric,
};

describe('AppMetricPlaceholder', () => {
  it('renders the metric title', () => {
    renderAppMetricPlaceholder();

    expect(screen.getByText(textMock(`admin.metrics.${metricName}`))).toBeInTheDocument();
  });

  it('renders a zero count', () => {
    renderAppMetricPlaceholder();

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders the no data disclaimer text', () => {
    renderAppMetricPlaceholder();

    expect(screen.getByText(textMock('admin.metrics.app.no_data'))).toBeInTheDocument();
  });

  it('renders a link to the OpenTelemetry docs', () => {
    renderAppMetricPlaceholder();

    const link = screen.getByRole('link', {
      name: textMock('admin.metrics.app.no_data_link'),
    });
    const expectedUrl = altinnDocsUrl({
      relativeUrl: 'altinn-studio/v8/guides/administration/monitor-and-instrument/',
    });

    expect(link).toHaveAttribute('href', expectedUrl);
    expect(link).toHaveAttribute('target', '_blank');
  });
});

const renderAppMetricPlaceholder = (props: Partial<typeof defaultProps> = {}) => {
  render(<AppMetricPlaceholder {...defaultProps} {...props} />);
};
