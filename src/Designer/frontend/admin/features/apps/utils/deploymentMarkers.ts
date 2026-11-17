import type { Chart, Plugin } from 'chart.js';
import type { AppDeploymentEvent } from 'admin/features/apps/types/AppDeploymentEvent';

/** One dashed line in a chart: the deployments that finished within the same bucket. */
export type DeploymentMarker = {
  /** The start of the bucket, in milliseconds since the epoch. */
  x: number;
  deployments: AppDeploymentEvent[];
};

/**
 * Groups deployments by the chart's buckets so that several in the same bucket become one line,
 * and leaves out the ones outside the chart's time axis.
 */
export function groupDeploymentsByBucket(
  deployments: AppDeploymentEvent[],
  bucketSizeMs: number,
  minMs: number,
  maxMs: number,
): DeploymentMarker[] {
  const byBucket = new Map<number, AppDeploymentEvent[]>();
  for (const deployment of deployments) {
    const finishedMs = Date.parse(deployment.finishedAt);
    if (Number.isNaN(finishedMs) || finishedMs < minMs || finishedMs > maxMs) {
      continue;
    }
    const bucket = Math.floor(finishedMs / bucketSizeMs) * bucketSizeMs;
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), deployment]);
  }
  return [...byBucket.entries()]
    .sort(([a], [b]) => a - b)
    .map(([x, grouped]) => ({ x, deployments: grouped }));
}

/** What a marker says above its line: the version, or how many deployments the bucket holds. */
export function markerLabel(marker: DeploymentMarker, manyText: (count: number) => string): string {
  return marker.deployments.length === 1
    ? marker.deployments[0].tagName
    : manyText(marker.deployments.length);
}

export type DeploymentMarkersOptions = {
  markers: DeploymentMarker[];
  manyText: (count: number) => string;
  lineColor: string;
  undeployColor: string;
  textColor: string;
};

/**
 * Draws one dashed vertical line per marker on the chart's time axis, with the label above it.
 * An undeploy is drawn in the undeploy color. The list under the chart is the table alternative.
 */
export function deploymentMarkersPlugin(options: DeploymentMarkersOptions): Plugin<'bar'> {
  return {
    id: 'deploymentMarkers',
    afterDatasetsDraw: (chart: Chart<'bar'>) => {
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      if (!xScale || !yScale) {
        return;
      }
      const { ctx } = chart;
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.font = '600 10px sans-serif';
      ctx.textBaseline = 'bottom';
      for (const marker of options.markers) {
        const x = xScale.getPixelForValue(marker.x);
        if (x < xScale.left || x > xScale.right) {
          continue;
        }
        const isUndeploy = marker.deployments.every(
          (deployment) => deployment.deploymentType === 'decommission',
        );
        ctx.strokeStyle = isUndeploy ? options.undeployColor : options.lineColor;
        ctx.beginPath();
        ctx.moveTo(x, yScale.top);
        ctx.lineTo(x, yScale.bottom);
        ctx.stroke();
        ctx.fillStyle = options.textColor;
        ctx.textAlign = x + 40 > xScale.right ? 'right' : 'left';
        ctx.fillText(
          markerLabel(marker, options.manyText),
          x + (ctx.textAlign === 'right' ? -3 : 3),
          yScale.top - 2,
        );
      }
      ctx.restore();
    },
  };
}
