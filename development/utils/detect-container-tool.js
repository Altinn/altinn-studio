const { exec } = require('child_process');

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
}

module.exports = ContainerTool;
