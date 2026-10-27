# Altinn Studio Language Server (JetBrains plugin)

A thin language-client plugin for Altinn Studio language server. Depends on LSP4IJ for code lens and

## Develop

Requires JDK 21+ on `PATH`/`JAVA_HOME` to run Gradle (the build provisions its own compile JDK).

```sh
./gradlew runIde        # sandboxed Rider with the plugin + LSP4IJ installed
./gradlew buildPlugin   # build/distributions/altinn-lsp-<version>.zip
./gradlew verifyPlugin  # binary compatibility check against recommended IDE baselines
```
