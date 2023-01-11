const { execSync } = require("child_process");
const path = require("path");
module.exports = (command) => {
  console.log("CMD:", command);
  try {
    execSync(command, {
      cwd: path.resolve(__dirname, ".."),
    });
  } catch (e) {
    console.error(`Error: ${e.stdout}`);
  }
};
