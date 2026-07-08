# Altinn App Config (VS Code extension)

A thin language-client extension for Altinn app configuration.
Launches a language server via `studioctl app lsp` over stdio.

## Develop

```sh
npm install
npm run compile        # or: npm run watch
```

## Package & install

```sh
npx --yes @vscode/vsce package
code --install-extension altinn-app-config-*.vsix
```
