# Setting up kubernetes storage, deployments, services and loadbalancer

## Requirements

- If you havn't run the scripts in the /scripts/-folder, do that first.
- kubectl cli installed (this is installed with the script in the /scripts/-folder)
- kubectl cli authenticated with Azure AKS (this is done in the script in the /scripts/-folder)
- Pushed apropriate images to Azure ACR

## Authenticate cli with Azure AKS

Run this command

- `az aks get-credentials --resource-group-name [resource group name] --name [cluster name]`

## Pushing images to Azure ACR

When pushing to Azure ACR you'll need:

- Docker installed
- Azure cli installed

When you have build the images you would like to push to the Azure ACR you'll need to tag these images
Do this by running the command:
`docker tag [local-image-name]:[local-image-tag] [azure container registry loginServer]/[remote-image-name]:[remote-image-tag]`

Then authenticate your docker client with the Azure ACR by running the command:
`az acr login --name [azure container registry name]`

Then push the image you tagged, by running the command:
`docker push [azure container registry loginServer]/[remote-image-name]:[remote-image-tag]`

## Deploying to kubernetes

### Before running kubectl-commands

- Check that the image-names and images-tags specified in `altinncore-loadbalancer.yaml` and `altinncore-deployment.yaml` are correct with what you have in Azure ACR
- Check that the images pull secret name is correct (To doublecheck, run the command `kubectl get sercrets`)

``` yaml
imagePullSecrets:
      - name: acr-auth #replace with your kubernetes secret name
```

- The one of the steps of that script creates a public static ip, you'll need this adress in `altinncore-loadbalancer.yaml`. Fill the ip adress in at the second to last line, where it says

``` yaml
  loadBalancerIP: 137.117.129.38 #replace with your public ip adress
```

Run these commands in the respective order:

- `kubectl apply -f altinncore-storage.yaml`
- `kubectl apply -f altinncore-db.yaml`
- `kubectl apply -f alcinncore-backup-job.yaml`
- `kubectl apply -f altinncore-jenkins.yaml`
- `kubectl apply -f altinncore-deployment.yaml`
- `kubectl apply -f altinncore-service.yaml`
- `kubectl apply -f altinncore-loadbalancer.yaml`

## Info

The cluster will create the neseccary necessary resources it needs in a resource group called "MC_[*resource-group-name*]_[*cluster-name*]_[*location*]"
The storage class creates 4 storage classes:

- 100gb to Gitea
- 10gb for TestData (Upload manually from /src/AltinnCore/Testdata)
- 20gb for Templates (Upload manually from /src/AltinnCore/Templates)
- 200gb for storage of Repos
- 250gb for postgres backups

## Updating pods

When building a new version of either designer, runtime or the loadbalancer, all you have to do is change the version of the image in i.e. `altinncore-deployment.yaml`.
Let's say i'll change for this:

``` yaml
(...)
      containers:
      - name: altinn-designer
        image: altinncontainerregistry.azurecr.io/altinn-core:1.0.0
        ports:
        - containerPort: 5000
(...)
```

into this:

``` yaml
(...)
      containers:
      - name: altinn-designer
        image: altinncontainerregistry.azurecr.io/altinn-core:1.0.1
        ports:
        - containerPort: 5000
(...)
```

And then just run `kubectl apply -f altinncore-deployment.yaml`.

Updating Gitea right now requires almost a entire rebuild of the kluster, since Gitea plays a part in both designer and runtime.
Before you do this: Take backup of any data you need.

- Comment out the storage classes and persistent volume claims that isn't related to the gitea pod or the postgres pod in `altinncore-storage.yaml`
- Run command: `kubectl delete -f altinncore-service.yaml -f altinncore-deployment.yaml -f altinncore-backup-job.yaml -f altinncore-db-yaml -f altinncore-storage.yaml`
- Update the gitea deployment within `altinncore-deployment.yaml`
- Then spinn up the cluster again:
  - `kubectl apply -f altinncore-storage.yaml`
  - `kubectl apply -f altinncore-db.yaml`
  - `kubectl apply -f alcinncore-backup-job.yaml`
  - `kubectl apply -f altinncore-deployment.yaml`
  - `kubectl apply -f altinncore-service.yaml`
  - `kubectl apply -f altinncore-loadbalancer.yaml`

## Tear down cluster

Files in storage will be deleted when storage is deleted. Comment out the storage that you need to reset (most likely the storage-class "altinn-storage-volume"
and the persistent-volume-claim "altinn-storage-volume-claim")
Run this command

- `kubectl delete -f altinncore-loadbalancer.yaml -f altinncore-service.yaml -f altinncore-deployment.yaml -f altinncore-storage.yaml`
