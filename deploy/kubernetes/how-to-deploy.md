# How to deploy

## Getting kubernetes context

When you are ready to deploy to a cluster, you'll need to set the kubectl context, this is done easily with Azure CLI (make sure you are logged in with the CLI):

```script
az aks get-credentials -g $RESOURCE_GROUP_NAME -n $KUBERNETES_SERVICE_NAME
```

## Finding image tags

When you have set the context, you'll need to figure out what you are deploying. Image-tags are the build-numbers in our Azure pipelines. These are also found in out container registry. Higher the number, the newer the build is.

## Update charts

When you have found the build number, you have to update the chart of what you are deploying.
If you are deploying altinn-designer, altinn-runtime or altinn-repositores, the chart you are looking for is `altinncore-deployments.yaml`-file. If you are updating altinn-loadbalancer, `altinncore-loadblancer`-file is where you'll update build-numbers.

For instance, if i want to deploy buildnumber 1337 of `altinn-designer`:

In the `altinncore-deployments.yaml`-file

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: altinn-designer
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: altinn-designer
    spec:
      containers:
      - name: altinn-designer
        image: altinntjenestercontainerregistry.azurecr.io/altinn-core:#{Release.Artifacts.Designer.BuildId}#
        # replace "#{Release.Artifacts.Designer.BuildId}#" with the build-number
        ports:
        - containerPort: 5000
        volumeMounts:
        - name: altinn-repo-storage
          mountPath: "/AltinnCore/Repos"
        - name: altinn-appsettings
          mountPath: "/altinn-appsettings"
        env:
        ...
```

So it will end up looking like this:

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: altinn-designer
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: altinn-designer
    spec:
      containers:
      - name: altinn-designer
        image: altinntjenestercontainerregistry.azurecr.io/altinn-core:1337
        # replace "#{Release.Artifacts.Designer.BuildId}#" with the build-number
        ports:
        - containerPort: 5000
        volumeMounts:
        - name: altinn-repo-storage
          mountPath: "/AltinnCore/Repos"
        - name: altinn-appsettings
          mountPath: "/altinn-appsettings"
        env:
        ...
```

## Deploying

When you have done all of the above, it's time to deploy. This is done with the `kubectl`-cli (kubernetes cli).
Beware of the order you deploy things. If you are deploying a new version of the altinn-loadbalancer and a new version of altinn-designer, you'll have to deploy altinn-designer before the loadbalancer.

Run the command:

```script
kubectl apply -f $PATH_TO_UPDATED_CHART
```

If you have updated multiple charts, just run them one by one with the same command.
