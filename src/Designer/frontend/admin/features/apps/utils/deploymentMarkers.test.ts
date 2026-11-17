import { describe, expect, it } from 'vitest';
import { groupDeploymentsByBucket, markerLabel } from './deploymentMarkers';
import type { AppDeploymentEvent } from 'admin/features/apps/types/AppDeploymentEvent';

const deployment = (finishedAt: string, tagName = 'v1.0.0'): AppDeploymentEvent => ({
  tagName,
  deploymentType: 'deploy',
  finishedAt,
  createdBy: 'kari',
});

const hour = 60 * 60 * 1000;
const min = Date.parse('2026-11-10T00:00:00Z');
const max = Date.parse('2026-11-11T00:00:00Z');

describe('groupDeploymentsByBucket', () => {
  it('puts deployments in the same bucket on one marker, in time order', () => {
    const markers = groupDeploymentsByBucket(
      [
        deployment('2026-11-10T14:10:00Z', 'v14.2.0'),
        deployment('2026-11-10T09:35:00Z', 'v14.1.0'),
        deployment('2026-11-10T09:50:00Z', 'v14.1.1'),
      ],
      hour,
      min,
      max,
    );

    expect(markers.map((marker) => marker.x)).toEqual([
      Date.parse('2026-11-10T09:00:00Z'),
      Date.parse('2026-11-10T14:00:00Z'),
    ]);
    expect(markers[0].deployments.map((d) => d.tagName)).toEqual(['v14.1.0', 'v14.1.1']);
  });

  it('leaves out deployments outside the axis and ones without a parsable time', () => {
    const markers = groupDeploymentsByBucket(
      [deployment('2026-11-09T23:59:00Z'), deployment('2026-11-11T00:01:00Z'), deployment('nope')],
      hour,
      min,
      max,
    );

    expect(markers).toEqual([]);
  });
});

describe('markerLabel', () => {
  it('shows the version for one deployment and a count for several', () => {
    const many = (count: number) => `${count} utrullinger`;
    expect(markerLabel({ x: 0, deployments: [deployment('x', 'v2.0.0')] }, many)).toBe('v2.0.0');
    expect(markerLabel({ x: 0, deployments: [deployment('x'), deployment('x')] }, many)).toBe(
      '2 utrullinger',
    );
  });
});
