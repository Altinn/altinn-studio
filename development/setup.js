const giteaApi = require('./utils/gitea-api.js');
const waitFor = require('./utils/wait-for.js');
const runCommand = require('./utils/run-command.js');
const ensureDotEnv = require('./utils/ensure-dot-env.js');
const dnsIsOk = require('./utils/check-if-dns-is-correct.js');
const createCypressEnvFile = require('./utils/create-cypress-env-file.js');
const path = require('path');
const ContainerTool = require('./utils/detect-container-tool.js');

class SetupEnvironment extends ContainerTool {
  env = {};
  containerManager = null;
  host = 'studio.localhost';

  constructor() {
    super();
    this.env = ensureDotEnv();
  }

  async setup() {
    this.containerManager = await this.detectContainerTool();

    if (this.containerManager === 'unknown') {
      throw new Error('Please use Podman or Docker as container manager tool');
    }

    await dnsIsOk(this.host);
    if (!(this.env.IGNORE_DOCKER_DNS_LOOKUP === 'true')) {
      await dnsIsOk(`host.${this.containerManager}.internal`);
    }
    await this.runCompose();
    await waitFor(`http://${this.host}/repos/`);
    await this.createGiteaAdminUser();
    await this.createCypressUser();

    await this.createTestDepOrg();
    await this.createTestDepTeams();
    await this.addUserToSomeTestDepTeams();
    await createCypressEnvFile(this.env);
    await this.addReleaseAndDeployTestDataToDb();
    process.exit(0);
  }

  async createGiteaAdminUser() {
    const { GITEA_ADMIN_USER: username, GITEA_ADMIN_PASS: password } = this.env;
    await this.createUser(username, password, true);
    await this.ensureUserPassword(username, password);
  }

  async createCypressUser() {
    const { GITEA_CYPRESS_USER: username, GITEA_CYPRESS_PASS: password } = this.env;
    await this.createUser(username, password, false);
    await this.ensureUserPassword(username, password);
  }

  runCompose() {
    if (this.containerManager === 'docker') {
      runCommand(`docker compose up -d --remove-orphans`);
      return;
    }

    // Podman does not support "--remove-orphans", hence this container manager check
    // Open Issue: https://github.com/containers/podman-compose/issues/815
    if (this.containerManager === 'podman') {
      // Remove old images, containers, and prune volumes
      runCommand(
        `podman stop --all && podman rm --all -f && podman rmi --all -f && podman volume prune -f`,
      );

      // Podman doesn't auto-detect .env files, like Docker do. Use "--env-file" to specify .env file.
      runCommand(`podman compose --env-file ${path.resolve(__dirname, '../.env')} up -d`);
      return;
    }
  }

  async createUser(username, password, admin) {
    return runCommand(
      [
        `${this.containerManager} exec studio-repositories gitea admin user create`,
        `--username ${username}`,
        `--password ${password}`,
        `--email ${username}@digdir.no`,
        admin ? `--admin` : undefined,
        `--must-change-password=false`,
      ].join(' '),
    );
  }

  async ensureUserPassword(username, password) {
    return runCommand(
      [
        `${this.containerManager} exec studio-repositories gitea admin user change-password`,
        `--username ${username}`,
        `--password ${password}`,
      ].join(' '),
    );
  }

  async createTestDepOrg() {
    giteaApi({
      path: '/repos/api/v1/orgs',
      method: 'POST',
      user: this.env.GITEA_ADMIN_USER,
      pass: this.env.GITEA_ADMIN_PASS,
      body: {
        username: this.env.GITEA_ORG_USER,
        full_name: 'Testdepartementet',
        description: 'Internt organisasjon for test av løsning',
      },
    });
  }

  async createTestDepTeams() {
    const allTeams = require(path.resolve(__dirname, 'data', 'gitea-teams.json'));

    const existingTeams = await giteaApi({
      path: `/repos/api/v1/orgs/${this.env.GITEA_ORG_USER}/teams`,
      method: 'GET',
      user: this.env.GITEA_ADMIN_USER,
      pass: this.env.GITEA_ADMIN_PASS,
    });

    for (const team of allTeams) {
      const existing = existingTeams?.find((t) => t.name === team.name);
      if (!existing) {
        await giteaApi({
          path: `/repos/api/v1/orgs/${this.env.GITEA_ORG_USER}/teams`,
          method: 'POST',
          user: this.env.GITEA_ADMIN_USER,
          pass: this.env.GITEA_ADMIN_PASS,
          body: Object.assign(
            {
              units: ['repo.code', 'repo.issues', 'repo.pulls', 'repo.releases'],
            },
            team,
          ),
        });
      }
    }
  }

  async addUserToSomeTestDepTeams() {
    const teams = await giteaApi({
      path: `/repos/api/v1/orgs/${this.env.GITEA_ORG_USER}/teams`,
      method: 'GET',
      user: this.env.GITEA_ADMIN_USER,
      pass: this.env.GITEA_ADMIN_PASS,
    });

    const addMemberToTeam = async (teamName, memberUsername) => {
      const existing = teams.find((t) => t.name === teamName);
      await giteaApi({
        path: `/repos/api/v1/teams/${existing.id}/members/${memberUsername}`,
        method: 'PUT',
        user: this.env.GITEA_ADMIN_USER,
        pass: this.env.GITEA_ADMIN_PASS,
      });
    };

    const teamNames = ['Owners', 'Deploy-TT02', 'Devs', 'Deploy-AT21', 'Deploy-AT22'];

    for (const teamName of teamNames) {
      await addMemberToTeam(teamName, this.env.GITEA_ADMIN_USER);
    }

    for (const teamName of teamNames) {
      await addMemberToTeam(teamName, this.env.GITEA_CYPRESS_USER);
    }
  }

  async addReleaseAndDeployTestDataToDb() {
    runCommand(
      [
        `${this.containerManager} exec -i studio-db psql`,
        `-U designer_admin designerdb`,
        `< development/db/data.sql`,
      ].join(' '),
    );
  }
}

new SetupEnvironment().setup().then().catch(console.error);
