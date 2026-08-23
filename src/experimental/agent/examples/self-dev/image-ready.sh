#!/bin/sh
set -eu

unit=agent-workspace-init.service
attempt=0
while [ "$attempt" -lt 900 ]; do
    # The Microsandbox guest agent can accept executions just before systemd's
    # private control socket is queryable. Treat that as not-ready, not failed.
    if invocation=$(/usr/bin/sudo /usr/bin/systemctl show "$unit" --property=InvocationID --value 2>/dev/null) \
        && active=$(/usr/bin/sudo /usr/bin/systemctl show "$unit" --property=ActiveState --value 2>/dev/null) \
        && result=$(/usr/bin/sudo /usr/bin/systemctl show "$unit" --property=Result --value 2>/dev/null)
    then
        if [ -n "$invocation" ]; then
            if [ "$active" = inactive ] && [ "$result" = success ]; then
                exit 0
            fi
            if [ "$active" = failed ] || [ "$active" = inactive ]; then
                echo "workspace clone failed; a Session may retry it" >&2
                exit 0
            fi
        fi
    fi
    attempt=$((attempt + 1))
    /usr/bin/sleep 1
done

echo "image initialization timed out: $unit" >&2
exit 1
