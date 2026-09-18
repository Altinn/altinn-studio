file=$1
buffer=$2
target=$3
trap '/usr/bin/tmux delete-buffer -b "$buffer" 2>/dev/null; /bin/rm -f -- "$file"' EXIT
/usr/bin/tmux load-buffer -b "$buffer" "$file" &&
    /usr/bin/tmux paste-buffer -d -p -b "$buffer" -t "$target" &&
    /bin/sleep 0.2 &&
    /usr/bin/tmux send-keys -t "$target" Enter
