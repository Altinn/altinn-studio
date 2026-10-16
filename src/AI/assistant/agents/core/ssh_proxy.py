"""ProxyCommand for ssh to a VM of the assistant runner.

It asks the runner to upgrade an HTTP connection to the SSH relay of the VM, and then copies bytes between
stdin, stdout and the connection.  ssh runs it with `python3 -I`, so it uses the standard library only.

Usage: ssh_proxy.py http://<runner pod>:8080/api/v1/vms/<id>/ssh
"""

from __future__ import annotations

import os
import socket
import sys
import threading
from urllib.parse import urlsplit

_CONNECT_TIMEOUT_SECONDS = 10
_MAX_HEAD_BYTES = 8 * 1024
_BUFFER_BYTES = 64 * 1024
_STDIN = 0


def main(relay_url: str) -> int:
    url = urlsplit(relay_url)
    connection = socket.create_connection((url.hostname, url.port or 80), timeout=_CONNECT_TIMEOUT_SECONDS)
    request = f"GET {url.path} HTTP/1.1\r\nHost: {url.netloc}\r\nConnection: Upgrade\r\nUpgrade: ssh\r\n\r\n"
    connection.sendall(request.encode())
    status_line = _read_head(connection).split(b"\r\n", 1)[0]
    if not status_line.startswith(b"HTTP/1.1 101"):
        sys.stderr.write(f"The assistant runner refused the SSH relay: {status_line.decode(errors='replace')}\n")
        return 1
    connection.settimeout(None)
    threading.Thread(target=_copy_stdin_to, args=(connection,), daemon=True).start()
    _copy_to_stdout(connection)
    return 0


def _read_head(connection: socket.socket) -> bytes:
    """Reads one byte at a time, so that no byte of the SSH stream after the head is lost."""
    head = b""
    while not head.endswith(b"\r\n\r\n") and len(head) < _MAX_HEAD_BYTES:
        byte = connection.recv(1)
        if not byte:
            break
        head += byte
    return head


def _copy_stdin_to(connection: socket.socket) -> None:
    while chunk := os.read(_STDIN, _BUFFER_BYTES):
        connection.sendall(chunk)
    connection.shutdown(socket.SHUT_WR)


def _copy_to_stdout(connection: socket.socket) -> None:
    while chunk := connection.recv(_BUFFER_BYTES):
        sys.stdout.buffer.write(chunk)
        sys.stdout.buffer.flush()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
