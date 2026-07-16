# Altinn Studio Language Server (VS Code extension)

A thin language-client extension for the Altinn Studio language server.
Launches a language server via `studioctl app lsp` over stdio.

Distributed as `altinnstudio.altinn-studio-lsp` on the Visual Studio Marketplace;
releases are driven by `CHANGELOG.md` (see the release workflow).

## Develop

```sh
npm install
npm run compile        # or: npm run watch
```

## Package & install

```sh
npx vsce package
code --install-extension altinn-studio-lsp-*.vsix
```
