{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.postgresql
    pkgs.jq
    pkgs.unzip
    pkgs.zip
    pkgs.libuuid
    pkgs.pkg-config
    pkgs.cairo
    pkgs.pango
    pkgs.libpng
    pkgs.libjpeg
    pkgs.giflib
    pkgs.librsvg
  ];
}
