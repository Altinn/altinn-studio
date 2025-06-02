# Kubernetes Wrapper
Application exposing information about deployments in kubernetes in a rest API

## Testing

### Linux and macOS
To test kuberneteswrapper in a kubernetes cluster (kind) lokally run the following command

```shell
make test
```

This will do the following
1. create a kind kubernetescluster
2. build kuberneteswrapper docker image
3. load the image into kind
4. deploy kuberneteswrapper and test services
5. add portfowrward to the kuberneteswrapper service in kind
6. test that kuberneteswrapper produces the expected responses

After the test command is executed a portforward on port 8080 is left intact if you want to execute api calls to kuberneteswrapper

To clean up after you are done testing run:

```shell
make clean
```