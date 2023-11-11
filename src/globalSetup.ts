/**
 * This setting is required to make sure that the tests run in the same timezone
 * across all environments. This is important for tests that use Date objects.
 *
 * Using a globalSetup file is the only way to set this environment variable
 * and be sure that the timezone is set before any tests are run (and any
 * date values are cached).
 *
 * Should work for Windows on node > 17.0.1
 */
module.exports = async () => {
  process.env.TZ = 'UTC';
};
