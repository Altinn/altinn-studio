#!/bin/sh
# Starts the Agent desktop session: a keyboard that can type Norwegian, a panel, a window manager.
set -eu

: "${AGENT_DESKTOP_DISPLAY:=:1}"
export DISPLAY=$AGENT_DESKTOP_DISPLAY
# xdotool decodes text with the locale's character set and refuses multi-byte input under the
# POSIX locale, so without this the desktop cannot type æ, ø or å.
export LC_ALL=${LC_ALL:-C.UTF-8}

for _ in $(seq 1 100); do
    xdpyinfo >/dev/null 2>&1 && break
    sleep 0.1
done
xdpyinfo >/dev/null 2>&1 || { echo "desktop session: $DISPLAY never came up" >&2; exit 1; }

# The Norwegian layout is what a person connecting to this desktop expects, and it is also the
# only one that types æøå in both cases: xdotool loses the shift level when it has to bind a
# character that the layout does not carry, so under a US layout ÆØÅ arrive as æøå.
setxkbmap no

# -c pins the configuration to the image: without it tint2 copies its template into the home
# directory, which the platform resynchronizes from the host on every Sandbox setup.
tint2 -c /etc/xdg/tint2/tint2rc >/dev/null 2>&1 &
exec openbox
