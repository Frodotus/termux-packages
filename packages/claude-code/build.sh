TERMUX_PKG_HOMEPAGE=https://github.com/Frodotus/termux-claude-code
TERMUX_PKG_DESCRIPTION="Claude Code AI assistant for Termux"
TERMUX_PKG_LICENSE="MIT"
TERMUX_PKG_MAINTAINER="@Frodotus"
TERMUX_PKG_VERSION=2.1.119
TERMUX_PKG_SKIP_SRC_EXTRACT=true
TERMUX_PKG_DEPENDS="nodejs, npm, patchelf, proot, proot-distro"

termux_step_make_install() {
	install -Dm755 "$TERMUX_PKG_BUILDER_DIR/claude"    "$TERMUX_PREFIX/bin/claude"
	install -Dm755 "$TERMUX_PKG_BUILDER_DIR/setup.sh"  "$TERMUX_PREFIX/bin/claude-code-setup"
}

termux_step_create_debscripts() {
	cat > postinst << 'EOF'
#!/bin/bash
echo "Run 'claude-code-setup' to finish installing Claude Code."
EOF
}
