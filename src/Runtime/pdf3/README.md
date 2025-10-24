# pdf3

New PDF generation solution for Altinn Studio apps.

- OS support: Linux and macOS
- Required Go 1.25+
- Requires `docker` or `podman` on the host system


## Local browser headless-shell installation

Some dependencies might be needed to run the headless-shell instance installed through `make browser`.
You can run `ldd <binary> | grep not` to see any dependencies the binary expects to be installed.

### Arch

These may or may not already be present, depending on env. On WSL 2 arch this is necessary:

```sh
sudo pacman -Sy nss at-spi2-core libxcomposite libxdamage libxrandr libxkbcommon mesa alsa-lib
```
