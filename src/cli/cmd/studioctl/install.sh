#!/usr/bin/env sh
set -eu

usage() {
	cat <<'USAGE'
Usage: install.sh [options]

Options:
  --version VERSION      GitHub release tag or name (default: latest)
  --repo OWNER/REPO      GitHub repo (default: Altinn/altinn-studio)
  --asset NAME           Override asset name
  --install-dir DIR      Install target directory (passes --path)
  --skip-resources       Skip downloading localtest resources
  --skip-checksum        Skip SHA256 checksum verification
  -h, --help             Show this help

Environment variables (overridden by flags):
  STUDIOCTL_VERSION
  STUDIOCTL_REPO
  STUDIOCTL_ASSET
  STUDIOCTL_INSTALL_DIR
  STUDIOCTL_SKIP_RESOURCES=1
  STUDIOCTL_SKIP_CHECKSUM=1

Examples:
  curl -sSL https://github.com/Altinn/altinn-studio/releases/latest/download/install.sh | sh
  curl -sSL .../install.sh | sh -s -- --version v0.1.0

Notes:
  - If stdin is not a TTY and --install-dir is not set, installs to ~/.local/bin.
  - Binary integrity is verified via SHA256 checksum before execution.
USAGE
}

REPO=${STUDIOCTL_REPO:-Altinn/altinn-studio}
VERSION=${STUDIOCTL_VERSION:-latest}
ASSET=${STUDIOCTL_ASSET:-}
INSTALL_DIR=${STUDIOCTL_INSTALL_DIR:-}
SKIP_RESOURCES=${STUDIOCTL_SKIP_RESOURCES:-0}
SKIP_CHECKSUM=${STUDIOCTL_SKIP_CHECKSUM:-0}

while [ $# -gt 0 ]; do
	case "$1" in
		--version)
			[ $# -ge 2 ] || { echo "error: --version requires a value"; exit 2; }
			VERSION=$2
			shift 2
			;;
		--repo)
			[ $# -ge 2 ] || { echo "error: --repo requires a value"; exit 2; }
			REPO=$2
			shift 2
			;;
		--asset)
			[ $# -ge 2 ] || { echo "error: --asset requires a value"; exit 2; }
			ASSET=$2
			shift 2
			;;
		--install-dir)
			[ $# -ge 2 ] || { echo "error: --install-dir requires a value"; exit 2; }
			INSTALL_DIR=$2
			shift 2
			;;
		--skip-resources)
			SKIP_RESOURCES=1
			shift
			;;
		--skip-checksum)
			SKIP_CHECKSUM=1
			shift
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			echo "error: unknown option: $1"
			usage
			exit 2
			;;
	esac
done

if [ "$VERSION" != "latest" ]; then
	# Strip studioctl/ prefix if present
	case "$VERSION" in
		studioctl/*) VERSION=${VERSION#studioctl/} ;;
	esac

	# Validate and normalize to tag format
	case "$VERSION" in
		v*) VERSION="studioctl/$VERSION" ;;
		*)
			echo "error: invalid version format: $VERSION (expected vX.Y.Z or studioctl/vX.Y.Z)"
			exit 2
			;;
	esac
fi

os=$(uname -s 2>/dev/null || echo unknown)
case "$os" in
	Darwin) os=darwin ;;
	Linux) os=linux ;;
	*)
		echo "error: unsupported OS: $os"
		exit 1
		;;
	esac

arch=$(uname -m 2>/dev/null || echo unknown)
case "$arch" in
	x86_64|amd64) arch=amd64 ;;
	aarch64|arm64) arch=arm64 ;;
	*)
		echo "error: unsupported architecture: $arch"
		exit 1
		;;
	esac

if [ -z "$ASSET" ]; then
	ASSET="studioctl-${os}-${arch}"
fi

if [ -z "$INSTALL_DIR" ] && [ ! -t 0 ]; then
	if [ -n "${HOME:-}" ]; then
		INSTALL_DIR="$HOME/.local/bin"
	else
		echo "error: HOME not set and --install-dir not provided"
		exit 1
	fi
fi

if [ "$VERSION" = "latest" ]; then
	base_url="https://github.com/${REPO}/releases/latest/download"
else
	base_url="https://github.com/${REPO}/releases/download/${VERSION}"
fi

url="${base_url}/${ASSET}"
checksums_url="${base_url}/SHA256SUMS"

download() {
	url=$1
	dest=$2
	if command -v curl >/dev/null 2>&1; then
		curl -fL --retry 3 --retry-delay 1 -o "$dest" "$url"
		return
	fi
	if command -v wget >/dev/null 2>&1; then
		wget -O "$dest" "$url"
		return
	fi
	echo "error: curl or wget is required"
	exit 1
}

tmpdir=$(mktemp -d 2>/dev/null || mktemp -d -t studioctl)
trap 'rm -rf "$tmpdir"' INT TERM EXIT

bin="$tmpdir/studioctl"
download "$url" "$bin"
chmod 0755 "$bin"

# Verify checksum
verify_checksum() {
	case "$SKIP_CHECKSUM" in
		1|true|TRUE|True)
			echo "Skipping checksum verification"
			return 0
			;;
	esac

	checksums_file="$tmpdir/SHA256SUMS"
	if ! download "$checksums_url" "$checksums_file" 2>/dev/null; then
		echo "error: Failed to download SHA256SUMS"
		exit 1
	fi

	# Extract expected checksum for our asset
	expected=""
	while read -r sum name _; do
		name=${name#\*}
		if [ "$name" = "$ASSET" ]; then
			expected=$sum
			break
		fi
	done < "$checksums_file"

	if [ -z "$expected" ]; then
		echo "error: Asset $ASSET not found in SHA256SUMS"
		exit 1
	fi

	# Calculate actual checksum
	if command -v sha256sum >/dev/null 2>&1; then
		actual=$(sha256sum "$bin" | cut -d' ' -f1)
	elif command -v shasum >/dev/null 2>&1; then
		actual=$(shasum -a 256 "$bin" | cut -d' ' -f1)
	else
		echo "error: sha256sum or shasum is required for checksum verification"
		exit 1
	fi

	if [ "$expected" != "$actual" ]; then
		echo "error: Checksum verification failed"
		echo "  Expected: $expected"
		echo "  Actual:   $actual"
		echo ""
		echo "The downloaded binary may be corrupted or tampered with."
		echo "Use --skip-checksum to bypass this check (not recommended)."
		exit 1
	fi

	echo "Checksum verified: $actual"
}

verify_checksum

case "$SKIP_RESOURCES" in
	1|true|TRUE|True)
		skip_flag="--skip-resources"
		;;
	*)
		skip_flag=""
		;;
esac

if [ -n "$INSTALL_DIR" ]; then
	"$bin" self install --path "$INSTALL_DIR" $skip_flag
else
	"$bin" self install $skip_flag
fi
