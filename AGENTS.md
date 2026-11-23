# AGENTS.md

Follow [CONTRIBUTING.md](CONTRIBUTING.md). The [README](README.md) says how the parts fit together.

- Read the code, not the docs, to learn how something works.
- Projects use different languages and versions. Check the project's `global.json`, `go.mod`, `package.json` or
  `pyproject.toml` before you assume a version.
- Before you report a change complete, run the checks that CONTRIBUTING.md and the component's README ask for. If you
  could not run one, or a test run rewrote snapshots, name them in your report.
- Skills are in [agents/\_skills/](agents/_skills). If one is not installed in your harness, read its `SKILL.md`
  there, or copy its directory into your harness's skill directory.
- What you learn about the product or how we work goes into the repository through a pull request, not into your
  harness's memory, so that the rest of the team can read and review it.
- An `AGENTS.md` deeper in the tree adds to this one for its directory.

## Writing

The [writing rules](docs/documentation.md#writing) do not apply to your conversation with the person prompting you.
In everything else, write for the reader, not as a record of your work. Leave out the steps you took, what you tried
first and lists the diff already shows, such as every test you added. Say what the diff cannot show, such as why the
change looks like this.
