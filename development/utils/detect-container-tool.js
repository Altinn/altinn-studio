const { exec } = require('child_process');

const PODMAN_MACHINE_NAME = 'altinn-studio-rootful-machine';

class ContainerTool {
  async detectContainerTool() {
    try {
      await this.execCommand('docker -v');
      return 'docker';
    } catch (dockerError) {
      try {
        await this.execCommand('podman -v');
        return 'podman';
      } catch (podmanError) {
        return 'unknown';
      }
    }
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error) => (error ? reject(error) : resolve()));
    });
  }

  async isRunningPodmanMachine() {
    try {
      await this.execCommand(`podman machine inspect ${PODMAN_MACHINE_NAME}`);
      return true;
    } catch {
      return false;
    }
  }

  async createRootfulPodmanMachine() {
    console.log('Creating a rootful podman machine');
    await this.execCommand(`podman machine init ${PODMAN_MACHINE_NAME} --rootful`);
  }

  async startPodmanMachine() {
    console.log('Starting podman machine');
    await this.execCommand(`podman machine start ${PODMAN_MACHINE_NAME}`);
  }
}

module.exports = ContainerTool;
