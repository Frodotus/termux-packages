TERMUX_PKG_HOMEPAGE=https://github.com/Frodotus/termux-app
TERMUX_PKG_DESCRIPTION="Generate Android app launcher stubs for bash tab completion"
TERMUX_PKG_LICENSE="GPL-3.0"
TERMUX_PKG_MAINTAINER="@Frodotus"
TERMUX_PKG_VERSION=1.0.0
TERMUX_PKG_SKIP_SRC_EXTRACT=true
TERMUX_PKG_PLATFORM_INDEPENDENT=true
TERMUX_PKG_DEPENDS="bash, termux-am"

termux_step_make_install() {
	install -Dm755 "$TERMUX_PKG_BUILDER_DIR/termux-apps-update" "$TERMUX_PREFIX/bin/termux-apps-update"
	install -Dm644 "$TERMUX_PKG_BUILDER_DIR/app-launchers.sh" "$TERMUX_PREFIX/etc/profile.d/app-launchers.sh"
}
