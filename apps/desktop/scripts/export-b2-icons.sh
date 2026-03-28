#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ICON_DIR="$ROOT_DIR/src-tauri/icons"
SOURCE_SVG="$ICON_DIR/icon-source.svg"
PREVIEW_PNG="$ICON_DIR/icon-source.svg.png"

if [[ ! -f "$SOURCE_SVG" ]]; then
  echo "Missing icon source: $SOURCE_SVG" >&2
  exit 1
fi

rm -rf "$ICON_DIR/icon.iconset"
mkdir -p "$ICON_DIR/icon.iconset"

qlmanage -t -s 1024 -o "$ICON_DIR" "$SOURCE_SVG" >/dev/null

if [[ ! -f "$PREVIEW_PNG" ]]; then
  echo "Failed to render PNG preview from SVG source." >&2
  exit 1
fi

cp "$PREVIEW_PNG" "$ICON_DIR/icon.png"
cp "$PREVIEW_PNG" "$ICON_DIR/icon-1024.png"

for size in 16 32 64 128 256 512; do
  cp "$ICON_DIR/icon-1024.png" "$ICON_DIR/icon-$size.png"
  sips -z "$size" "$size" "$ICON_DIR/icon-$size.png" >/dev/null
done

cp "$ICON_DIR/icon-16.png" "$ICON_DIR/icon.iconset/icon_16x16.png"
cp "$ICON_DIR/icon-32.png" "$ICON_DIR/icon.iconset/icon_16x16@2x.png"
cp "$ICON_DIR/icon-32.png" "$ICON_DIR/icon.iconset/icon_32x32.png"
cp "$ICON_DIR/icon-64.png" "$ICON_DIR/icon.iconset/icon_32x32@2x.png"
cp "$ICON_DIR/icon-128.png" "$ICON_DIR/icon.iconset/icon_128x128.png"
cp "$ICON_DIR/icon-256.png" "$ICON_DIR/icon.iconset/icon_128x128@2x.png"
cp "$ICON_DIR/icon-256.png" "$ICON_DIR/icon.iconset/icon_256x256.png"
cp "$ICON_DIR/icon-512.png" "$ICON_DIR/icon.iconset/icon_256x256@2x.png"
cp "$ICON_DIR/icon-512.png" "$ICON_DIR/icon.iconset/icon_512x512.png"
cp "$ICON_DIR/icon-1024.png" "$ICON_DIR/icon.iconset/icon_512x512@2x.png"

if sips -s format ico "$ICON_DIR/icon-256.png" --out "$ICON_DIR/icon.ico" >/dev/null 2>&1; then
  echo "Generated icon.ico"
else
  echo "sips could not create icon.ico from the current PNG assets." >&2
fi

if iconutil -c icns "$ICON_DIR/icon.iconset" -o "$ICON_DIR/icon.icns" >/dev/null 2>&1; then
  echo "Generated icon.icns"
else
  echo "iconutil could not create icon.icns from the current iconset; PNG and ICO assets were generated successfully." >&2
fi

echo "Exported TimeAura B2 icon assets into $ICON_DIR"
