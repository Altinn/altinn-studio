# Sandbox node integration

`sandbox-node` prepares local Sandbox storage and advertises eight logical access slots for the host
`/dev/kvm` character device as the Kubernetes extended resource `devices.altinn.studio/kvm`. It lets
independent Sandbox coordinators share a large node without running as privileged containers.

## Behavior

- Identifies Azure local NVMe data disks by their documented controller model.
- Idempotently assembles them as RAID0, formats the array as reflink-enabled XFS and mounts it at
  `/var/lib/altinn/sandbox`.
- Refuses to register unless storage preparation succeeds and `/dev/kvm` is a character device.
- Registers eight healthy `devices.altinn.studio/kvm` slots (`kvm-0` through `kvm-7`) with kubelet.
- Allocates `/dev/kvm` with `rw` device-cgroup permissions.
- Reports the device unhealthy if the character device disappears.
- Detects kubelet removal of the plugin socket and re-registers.
- Cleans up its socket on SIGINT and SIGTERM.

Path validation cannot prove that KVM ioctls work because the non-privileged plugin itself is not
allocated the device. A consuming smoke-test Pod must execute `KVM_GET_API_VERSION` and `KVM_CREATE_VM`
before the runner workload is enabled.

The slots are scheduler capacity, not distinct physical devices: every slot injects the same
shareable `/dev/kvm`. Each coordinator requests one slot and creates one Sandbox. CPU and memory
requests normally limit packing before the eight-slot ceiling on the homogeneous
`Standard_D32ds_v6` Sandbox pool.
