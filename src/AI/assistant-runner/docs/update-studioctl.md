# Update studioctl in the guest image

[`Dockerfile.guest`](../Dockerfile.guest) pins studioctl with two values. Renovate cannot change them together, so
update them manually:

1. Set `STUDIOCTL_VERSION` to the new release tag, for example `v0.1.0-preview.30`.
2. Set `STUDIOCTL_INSTALL_SCRIPT_SHA256` to the SHA-256 of `install.sh` of that release:

   ```sh
   gh release download studioctl/v0.1.0-preview.30 -R Altinn/altinn-studio -p install.sh -O - | sha256sum
   ```

3. Open a pull request. CI upgrades the v8 template with the new version in a microVM.
