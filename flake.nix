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
            name = "tailwindcss-language-server";
            src = ./.;
            buildInputs = with pkgs; [ nodejs ];
            installPhase = ''
              mkdir -p $out/bin
              cp ./bin/* $out/bin
            '';
          };
        };
    };
}
