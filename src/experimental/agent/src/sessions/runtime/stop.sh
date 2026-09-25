/usr/bin/tmux kill-session -t "$1" 2>/dev/null && exit 0
# A Session that is already gone, or a server that is no longer running, is stopped.
/usr/bin/tmux has-session -t "$1" 2>/dev/null && exit 1
exit 0
