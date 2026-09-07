/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const fs = require('node:fs');
const path = require('node:path');

function configureCypressShard(config, { specRoot, timingsFile, total, number }) {
  if (total === undefined && number === undefined) {
    return config;
  }

  const shardTotal = parseInteger(total, 'E2E_SHARD_TOTAL');
  const shardNumber = parseInteger(number, 'E2E_SHARD_NUMBER');
  const shardIndex = shardNumber - 1;
  if (shardTotal < 1) {
    throw new Error('E2E_SHARD_TOTAL must be greater than zero.');
  }
  if (shardNumber < 1 || shardNumber > shardTotal) {
    throw new Error(`E2E_SHARD_NUMBER must be between 1 and ${shardTotal}.`);
  }

  const specs = findSpecs(specRoot);
  if (shardTotal > specs.length) {
    throw new Error(`Cannot split ${specs.length} Cypress specs across ${shardTotal} shards.`);
  }

  const timingData = JSON.parse(fs.readFileSync(timingsFile, 'utf8')).durations;
  const durations = new Map(timingData.map(({ spec, duration }) => [spec, duration]));
  const averageDuration = timingData.reduce((sum, { duration }) => sum + duration, 0) / timingData.length;
  const shards = Array.from({ length: shardTotal }, () => ({ duration: 0, specs: [] }));
  let specsWithoutTimings = 0;

  const weightedSpecs = specs
    .map((spec) => {
      const relativeSpec = toPosixPath(path.relative(config.projectRoot, spec));
      const duration = durations.get(relativeSpec);
      if (duration === undefined) {
        specsWithoutTimings += 1;
      }
      return { spec, duration: duration ?? averageDuration };
    })
    .sort((left, right) => right.duration - left.duration || left.spec.localeCompare(right.spec));

  for (const spec of weightedSpecs) {
    const shard = shards.reduce((shortest, candidate) =>
      candidate.duration < shortest.duration ? candidate : shortest,
    );
    shard.specs.push(spec.spec);
    shard.duration += spec.duration;
  }

  const selectedShard = shards[shardIndex];
  config.specPattern = selectedShard.specs.sort();
  const missingTimingMessage =
    specsWithoutTimings > 0
      ? ` (${specsWithoutTimings} ${specsWithoutTimings === 1 ? 'spec uses' : 'specs use'} the historical average)`
      : '';
  console.log(
    `Cypress shard ${shardNumber}/${shardTotal}: ${selectedShard.specs.length} specs, ${Math.round(selectedShard.duration / 1000)} estimated seconds${missingTimingMessage}`,
  );

  return config;
}

function findSpecs(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? findSpecs(entryPath) : entryPath.endsWith('.ts') ? [entryPath] : [];
    })
    .sort();
}

function parseInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer.`);
  }
  return parsed;
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

module.exports = configureCypressShard;
