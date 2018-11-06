# Deploying to a SBL cluster (not dependant on Legacy mode)

## Change kubectl context

* Run the script `change-config.ps1`
* It will ask you for the resource group name and the cluster name

## Creating the cluster

* Read the readme under /deploy/kubernetes
* When the cluster is up and running:
  * Apply the .yaml file under `\helm-rbac`
    * `kubectl apply -f .\helm-rbac\rbac-config.yaml`
  * Install helm cli on your computer
    * https://github.com/helm/helm/blob/master/docs/install.md
  * Install helm on the cluster
    * `helm init --service-account tiller`

### Installing Traefik ingress on the cluster

* Apply the .yaml files under `\Traefik`
  * `kubectl apply -f .\Traefik\ClusterRoleBinding.yaml`
    * Apply the cluster role binding first, since the Traefik-deployment uses the clusterrole
  * `kubectl apply -f .\Traefik\Traefik.yaml`
* When the deployment is done, check out the traefik-service in the `kube-system`-namespace
  * `kubectl get services -n=kube-system`
    * Add `-w` at the end of the command to "watch" for changes.
* When the service has a public ip, copy this into your hosts-file
  * On windows this file is located in `C:\Windows\System32\drivers\etc`
  * Open the file in Notepad (with elevated rights)
  * Add the following the hosts-file
    * `[[THE PUBLIC IP OF YOUR TRAEFIK SERVICE]]  example-repo.sbl-cluster`

### Installing the SBL-service on the cluster

* This requires that you have an SBL-image, and have access to it from within the cluster.
* With the terminal current path pointing to `\deploy\deploy\sbl-cluster`
  * Run command `helm install example-repo`
  * This will set up all the deployments and services for the SBL-service. It will also add an ingress routing.
* When the installation is done, it will show a link in the terminal window, your application may take 10-20 seconds before it is up and running.
  * This requires the correct domain and public ip in host files or setup of a domain for that public ip.