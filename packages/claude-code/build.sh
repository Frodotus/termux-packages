TERMUX_PKG_HOMEPAGE=https://github.com/Frodotus/termux-claude-code
TERMUX_PKG_DESCRIPTION="Claude Code AI assistant for Termux"
TERMUX_PKG_LICENSE="MIT"
TERMUX_PKG_MAINTAINER="@Frodotus"
TERMUX_PKG_VERSION=2.1.119
TERMUX_PKG_SKIP_SRC_EXTRACT=true
TERMUX_PKG_PLATFORM_INDEPENDENT=true
TERMUX_PKG_DEPENDS="nodejs, npm"

termux_step_make_install() {
	install -Dm755 "$TERMUX_PKG_BUILDER_DIR/claude"          "$TERMUX_PREFIX/bin/claude"
	install -dm755 "$TERMUX_PREFIX/lib/claude-code"
	install -Dm644 "$TERMUX_PKG_BUILDER_DIR/prepare-native.js" "$TERMUX_PREFIX/lib/claude-code/prepare-native.js"
	install -Dm644 "$TERMUX_PKG_BUILDER_DIR/run-native.js"     "$TERMUX_PREFIX/lib/claude-code/run-native.js"
	install -Dm644 "$TERMUX_PKG_BUILDER_DIR/audited-versions.json" "$TERMUX_PREFIX/lib/claude-code/audited-versions.json"
}
