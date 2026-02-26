const { createServer } = require('@lhci/server');

const PROJECT_SLUG = 'altinn-app';
const PROJECT_NAME = 'Altinn App Frontend';

async function main() {
  const basicAuthUsername = process.env.LHCI_BASIC_AUTH_USERNAME;
  const basicAuthPassword = process.env.LHCI_BASIC_AUTH_PASSWORD;
  const sqlConnectionUrl = process.env.LHCI_STORAGE__SQL_CONNECTION_URL;
  const sqlDialect = process.env.LHCI_STORAGE__SQL_DIALECT || 'postgres';

  if (!sqlConnectionUrl) {
    throw new Error('LHCI_STORAGE__SQL_CONNECTION_URL is required');
  }

  if (!basicAuthUsername || !basicAuthPassword) {
    console.warn(
      'Warning: LHCI_BASIC_AUTH_USERNAME and LHCI_BASIC_AUTH_PASSWORD not set. BasicAuth is disabled.',
    );
  }

  // SSL configuration for database connection
  // Default to requiring SSL for security, disable only for local development
  const requireSsl = process.env.LHCI_DB_SSL_DISABLED !== 'true';

  const config = {
    port: 9001,
    storage: {
      storageMethod: 'sql',
      sqlDialect: sqlDialect,
      sqlConnectionUrl: sqlConnectionUrl,
      sqlDialectOptions: requireSsl
        ? {
            ssl: {
              require: true,
            },
          }
        : {},
      sequelizeOptions: {
        schema: 'lhci',
      },
    },
  };

  if (basicAuthUsername && basicAuthPassword) {
    config.basicAuth = {
      username: basicAuthUsername,
      password: basicAuthPassword,
    };
  }

  const { app, storageMethod } = await createServer(config);

  await storageMethod.initialize(config.storage);

  const existingProject = await storageMethod.findProjectBySlug(PROJECT_SLUG);

  if (!existingProject) {
    console.log(`Project "${PROJECT_SLUG}" not found. Creating...`);

    // createProject automatically generates token and adminToken
    const project = await storageMethod._createProject({
      name: PROJECT_NAME,
      slug: PROJECT_SLUG,
      externalUrl: 'https://github.com/Altinn/altinn-studio',
    });

    console.log('========================================');
    console.log('Project created successfully!');
    console.log(`Project ID: ${project.id}`);
    console.log(`Project Slug: ${project.slug}`);
    console.log(`Build Token: ${project.token}`);
    console.log('========================================');
    console.log('IMPORTANT: Copy the build token above and store it as:');
    console.log('  GitHub secret: LHCI_ALTINN_APP_BUILD_TOKEN');
    console.log('');
    console.log('NOTE: With basicAuth enabled, the build token is optional');
    console.log('but can be used as a backup authentication method.');
    console.log('========================================');
  } else {
    console.log(`Project "${PROJECT_SLUG}" already exists (ID: ${existingProject.id})`);
  }

  const environment = process.env.LHCI_ENVIRONMENT;
  const host =
    environment === 'prod'
      ? 'altinn.studio'
      : environment
        ? `${environment}.altinn.studio`
        : 'localhost';
  const serverUrl = environment ? `https://${host}:9001` : `http://${host}:9001`;

  console.log(`LHCI server listening on port 9001`);
  console.log(`Server URL: ${serverUrl}`);
  if (basicAuthUsername) {
    console.log('BasicAuth is enabled');
  }

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing LHCI server');
    await storageMethod.close();
    console.log('LHCI server closed');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Failed to start LHCI server:', err);
  process.exit(1);
});
