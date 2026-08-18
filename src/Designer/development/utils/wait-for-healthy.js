const { execSync } = require('child_process');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const healthStatus = (name) => {
  try {
    const buffer = execSync(`docker inspect --format="{{json .State.Health.Status}}" ${name}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(buffer.toString());
  } catch {
    return null; // container not created yet, or it has no healthcheck yet
  }
};

/**
 * Waits until the container reports healthy. Checks immediately and then twice a second, so the
 * setup continues as soon as the container is ready rather than at the next full second.
 */
module.exports = async (name, timeout = 60000) => {
  const deadline = Date.now() + timeout;

  for (;;) {
    if (healthStatus(name) === 'healthy') {
      console.log(name, ' is healthy!');
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Giving up waiting for healthy: ${name}`);
    }
    await delay(500);
  }
};
