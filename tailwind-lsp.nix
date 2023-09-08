{ lib, config, dream2nix, ... }: {
  imports = [
    dream2nix.modules.dream2nix.nodejs-package-lock
    dream2nix.modules.dream2nix.nodejs-granular
  ];

  mkDerivation = { src = ./.; };

  deps = { nixpkgs, ... }: { inherit (nixpkgs) fetchFromGitHub stdenv; };

  name = "tailwindcss-language-server";
  version = "0.0.13";
}
