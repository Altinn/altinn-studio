transcript=$2
values=$(/usr/bin/tmux list-sessions -F '#{session_attached} #{session_activity}' -f "#{==:#{session_name},$1}")
status=$?
case $status in 0) ;; 1) exit 10 ;; *) exit 11 ;; esac
set -- $values
[ "$#" -eq 0 ] && exit 10
[ "$#" -eq 2 ] || exit 11
latest=$2
if [ -f "$transcript" ]; then
    modified=$(/usr/bin/stat -c %Y -- "$transcript") || exit 11
    [ "$modified" -le "$latest" ] || latest=$modified
fi
now=$(/usr/bin/date +%s) || exit 11
age=$((now - latest))
[ "$age" -ge 0 ] || age=0
printf '%s %s\n' "$1" "$age"
