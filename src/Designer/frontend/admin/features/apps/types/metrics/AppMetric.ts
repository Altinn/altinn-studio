export type AppMetric = {
  name: string;
  timestamps: number[];
  counts: number[];
  /**
   * The count for the whole range. An error metric that counts instances cannot sum its counts, since one instance can
   * fail in several buckets. A gateway that predates it sends none.
   */
  count?: number | null;
  bucketSize: number;
  logsUrl: string;
};
