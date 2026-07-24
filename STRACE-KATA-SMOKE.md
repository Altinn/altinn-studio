# strace Kata smoke test

## Result

The `strace` attachment to a long-running sibling process succeeded. The trace was deliberately stopped
after two seconds with `timeout`; exit status `124` therefore indicates that the time limit was reached,
not that attachment failed. `strace` explicitly reported that it attached to and detached from the target.

## Commands and relevant output

### Install and identify `strace`

```console
$ nvt-as-root apt-get update
Hit:1 https://packages.microsoft.com/ubuntu/24.04/prod noble InRelease
Hit:2 https://ppa.launchpadcontent.net/git-core/ppa/ubuntu noble InRelease
Hit:3 https://security.ubuntu.com/ubuntu noble-security InRelease
Hit:4 https://archive.ubuntu.com/ubuntu noble InRelease
Hit:5 https://archive.ubuntu.com/ubuntu noble-updates InRelease
Hit:6 https://archive.ubuntu.com/ubuntu noble-backports InRelease
Reading package lists...

$ nvt-as-root apt-get install -y strace
The following NEW packages will be installed:
  strace

$ strace --version | head -1
strace -- version 6.8
```

### Attach to a long-running sibling process

The shell started both the target and `strace`, making them sibling processes:

```console
$ sleep 300 & sibling_pid=$!
$ timeout --signal=INT 2s strace -p "$sibling_pid" -e trace=clock_nanosleep
strace: Process 4755 attached
strace: Process 4755 detached
$ echo $?
124
```

The process ID is transient. The attach and detach messages demonstrate that ptrace attachment succeeded;
the timeout status is expected because `sleep` was intentionally still running.

### Runtime and virtualization evidence

```console
$ uname -a
Linux default-29bb3eba79-agent 6.6.137.mshv1-1.azl3 #1 SMP Tue May 19 17:02:13 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux

$ systemd-detect-virt
docker

$ awk -F ': ' '/^(vendor_id|model name|flags)[[:space:]]*:/ {print; if (++seen == 3) exit}' /proc/cpuinfo
vendor_id       : GenuineIntel
model name      : Intel(R) Xeon(R) Platinum 8370C CPU @ 2.80GHz
flags           : ... hypervisor ...
```

`systemd-detect-virt` identifies the immediate environment as a Docker container. The CPU exposes the
`hypervisor` flag, and the kernel release contains the `mshv` marker. Together these are evidence that the
container is hosted in a virtualized environment rather than directly on bare metal. They do not, by
themselves, identify the pod's Kubernetes RuntimeClass or prove that Kata Containers supplied the VM
isolation.

## External verification required

The Kubernetes RuntimeClass must be verified externally from the Kubernetes control plane (for example,
by inspecting the pod specification and the cluster's RuntimeClass configuration). That information is
not available from these container-local checks.
