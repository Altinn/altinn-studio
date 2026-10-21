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
requests normally limit packing before the eight-slot ceiling of a node.

## Node pools

No infrastructure code defines the Studio node pools, so this section records the pools that
`sandbox-node` runs on. Update it when a pool changes.

A Sandbox node pool needs:

- the label `purpose=sandbox` and the taint `purpose=sandbox:NoSchedule`, which the DaemonSet and the
  Sandbox workloads select and tolerate;
- `amd64` nodes with nested virtualization, so that `/dev/kvm` exists;
- local NVMe data disks with the controller model `Microsoft NVMe Direct Disk`, such as the `d` sizes of
  the Dv6 series. `init-storage.sh` refuses to prepare a node without them.

| Environment | VM size                     | Autoscaling  | Workloads        |
| ----------- | --------------------------- | ------------ | ---------------- |
| prod        | `Standard_D32ds_v6`         | Not recorded | GitHub runners   |
| dev         | `Standard_D8ds_v6`, planned | 0 to 1 nodes | Assistant runner |

Read the settings of an existing pool before you add one, and use the same OS SKU:

```sh
az aks nodepool show --resource-group <resource-group> --cluster-name <cluster> --name <pool>
```

Add a pool:

```sh
az aks nodepool add \
  --resource-group <resource-group> \
  --cluster-name <cluster> \
  --name sandbox \
  --mode User \
  --node-vm-size Standard_D8ds_v6 \
  --os-sku <os-sku-of-the-prod-pool> \
  --labels purpose=sandbox \
  --node-taints purpose=sandbox:NoSchedule \
  --enable-cluster-autoscaler --min-count 0 --max-count 1
```

When the first node is up, check that it reports `devices.altinn.studio/kvm`, and run the KVM smoke
test described above before a workload uses the node.
