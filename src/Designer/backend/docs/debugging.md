# Debugging Designer in a cluster

Designer runs in a chiseled .NET image, which has no shell and no tools such as `ls`, `cat` or `tar`. So
`kubectl exec` into the Designer container and `kubectl cp` do not work. Use a container of your own instead.

## Files on the repository share

Every Designer pod mounts the same Azure Files share with the clones. To look at them, start a pod that mounts the
share read-only, as Designer's user, from an image with the tools you need:

```sh
kubectl run designer-files -n default --rm -it --restart=Never --image=alpine/git --overrides='{
  "spec": {
    "securityContext": { "runAsUser": 1654, "runAsGroup": 1654 },
    "containers": [{
      "name": "designer-files", "image": "alpine/git", "command": ["sh"], "stdin": true, "tty": true,
      "volumeMounts": [{ "name": "repos", "mountPath": "/AltinnCore/Repos", "readOnly": true }]
    }],
    "volumes": [{ "name": "repos", "persistentVolumeClaim": { "claimName": "altinn-storage-repo-premium-volume-claim", "readOnly": true } }]
  }
}'
```

The pod runs as Designer's user because the share appears owned by that user, and git refuses to work in a
repository that another user owns. It mounts the share read-only so that it cannot change a clone Designer is using.
Kubernetes deletes the pod when you leave the shell.

## The running process

To look at Designer's process, such as its environment, its files or its threads, attach a debug container to the
pod. It shares Designer's process namespace and runs as Designer's user, which the `restricted` profile allows:

```sh
kubectl debug -it <pod> -n default --profile=restricted --image=busybox --target=altinn-designer -- sh
```

Designer's process is PID 1 in there. `/proc/1/environ` holds its environment and `/proc/1/root/app` the files in
its image. For a memory dump or a trace, use an image with the .NET diagnostics tools instead of busybox. The debug
container stays in the pod's definition until the pod is replaced.

## Locally

The same holds for the `studio-designer` container in the [local stack](../../development/README.md):
`docker exec` cannot start a shell in it. Mount the volume in another container instead:

```sh
docker run --rm -it -v designer_designer-git-data:/AltinnCore/Repos alpine sh
```
