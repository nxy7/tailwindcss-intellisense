{
  description = "Project starter";
  inputs = {
    nixpkgs.url = "nixpkgs/nixpkgs-unstable";
    dream2nix.url = "github:nix-community/dream2nix";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs = { flake-parts, nixpkgs, ... }@inputs:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "x86_64-linux" ];
      perSystem = { config, system, ... }:
        let pkgs = import nixpkgs { inherit system; };
        in {
          devShells.default = pkgs.mkShell {
            packages = with pkgs; [ nodejs nodePackages.node2nix ];
          };
          # packages = inputs.dream2nix.lib.importPackages {
          #   projectRoot = ./.;
          #   projectRootFile = ".git";
          #   packagesDir = "./.";
          # };
          packages.default = pkgs.stdenv.mkDerivation {
            name = "my-webpack-app";
            src = ./my-app;
            buildInputs = with pkgs; [ nodejs ];
            buildPhase = ''
              ln -s ${./.}/lib/node_modules ./node_modules
              export PATH="${./.}/bin:$PATH"
              ln -s ${
                ./packages/tailwindcss-language-server
              }/lib/node_modules ./packages/tailwindcss-language-server/node_modules
              export PATH="${./packages/tailwindcss-language-server}/bin:$PATH"

              # Build the distribution bundle in "dist"
              cd packages/tailwindcss-language-server
              npm run build
              cp -r bin $out/
            '';
          };
        };
    };
}
