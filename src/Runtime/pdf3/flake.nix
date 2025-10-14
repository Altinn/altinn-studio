{
  description = "A Nix-flake-based Go development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, ... }@inputs:

    let
      goVersion = 25; # Change this to update the whole stack

      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forEachSupportedSystem =
        f:
        inputs.nixpkgs.lib.genAttrs supportedSystems (
          system:
          f {
            pkgs = import inputs.nixpkgs {
              inherit system;
              overlays = [ inputs.self.overlays.default ];
            };
          }
        );
    in
    {
      overlays.default = final: prev: {
        go = final."go_1_${toString goVersion}";
      };

      devShells = forEachSupportedSystem (
        { pkgs }:
        {
          default = pkgs.mkShellNoCC {
            packages = with pkgs; [
              # go (version is specified by overlay)
              go
              gopls # LSP
              delve # debugger
              gotools # goimports, godoc, etc.
              golangci-lint # https://github.com/golangci/golangci-lint

              # k8s
              kubectl
              kubernetes-helm
              kind
              linkerd_edge
              stern
              step-cli

              # other
              k6
            ];

            shellHook = ''
              # Ensure Nix paths come before mise paths
              export PATH=$(echo "$PATH" | tr ':' '\n' | grep '^/nix/store' | tr '\n' ':')$(echo "$PATH" | tr ':' '\n' | grep -v '^/nix/store' | tr '\n' ':' | sed 's/:$//')

              which go
              go version
            '';
          };
        }
      );
    };
}
