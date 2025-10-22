# pdf3

New PDF generation solution for Altinn Studio apps.

* OS support: Linux and macOS
* Dev env using nix: `nix develop`
* Requires `docker` or `podman` on the host system

## Nix setup

Nix should work using the standard installers.
Need to change config to use flakes:

```sh
echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
# Or
echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf
```

## MacOS potential issues

- https://github.com/NixOS/nixpkgs/issues/355486
