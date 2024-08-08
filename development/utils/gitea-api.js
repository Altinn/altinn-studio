const { request } = require('http');

/**
 * @see http://studio.localhost/repos/api/swagger
 *
 * @param options
 * @returns {Promise<unknown>}
 */
module.exports = async (options) => {
  try {
    const response = await fetch(`http://localhost:3000${options.path}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${options.user}:${options.pass}`).toString('base64')}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    console.log(response.status);
    console.log(response.toString());

    const data = await response.json().catch((err) => {
      console.error('Error:', err);
    });
    console.log(options.method, options.path, response.status, response.statusText);
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
