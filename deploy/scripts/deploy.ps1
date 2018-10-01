Write-Output "This will run you through the deployment of a kubernetes cluster and container repository in a resouce group"

$locations = (az account list-locations --query "[].{name:name}" -o tsv).split("`t")

$resourceGroupName = Read-Host -Prompt "Resource group name [a-z, A-Z, 0-9, _, -]"
while (!($resourceGroupName -match '[a-zA-Z0-9,_,-]')) {
  Write-Output "Resource group name not valid"
  $resourceGroupName = Read-Host -Prompt "Resource group name"
}

$location = Read-Host -Prompt "Location"
while (!($locations.Contains($location))) {
  Write-Output "Location invalid"
  $location = Read-Host -Prompt "Location"
}

Write-Output "Setting up the resource group..."
az group create --location $location --name $resourceGroupName

Write-Output "Creating the kubernetes cluster"
$clusterName = Read-Host -Prompt "Cluster name"
while (!($clusterName -match '^[a-z,A-Z,0-9,-]*$')) {
  Write-Output "Looks like the cluster name is invalid"
  $clusterName = Read-Host -Prompt "Cluster name"
}
$nodeCount = Read-Host -Prompt "Node count"
while (!($nodeCount -match '^[0-9]*$')) {
  Write-Output "Looks like the number of nodes is invalid try a new number"
  $nodeCount = Read-Host -Prompt "Node count"
}
$clusterVersion = Read-Host -Prompt "Cluster version"

Write-Output "Setting up the kubernetes cluster..."
az aks create --resource-group $resourceGroupName --name $clusterName --node-count $nodeCount  --kubernetes-version $clusterVersion --generate-ssh-keys

Write-Output "Installing kubernetes cli"
az aks install-cli

Write-Output "Connecting to the cluster"
az aks get-credentials --resource-group $resourceGroupName --name $clusterName

Write-Output "Creating the container registry"
$containerRegistryName = Read-Host -Prompt "Container registry name"
while (!($containerRegistryName -match '^[a-zA-Z0-9]*$')) {
  Write-Output "Looks like the registry name is invalid, type a new name"
  $containerRegistryName = Read-Host -Prompt "Container registry name"
}
$containerRegistrySku = Read-Host -Prompt "Container registry SKU"

Write-Output "Setting up container registry..."
az acr create --name $containerRegistryName --resource-group $resourceGroupName --sku $containerRegistrySku

Write-Output "Creating service principal for container registry"
$servicePrincipalName = Read-Host -Prompt "Service princpal name"
$acrResources = (az acr list --query "[0].{id:id,loginServer:loginServer}" --output tsv).split("`t")
$servicePrincipalPassword = az ad sp create-for-rbac --name $servicePrincipalName --role Reader --scopes $acrResources[0] --query password --output tsv
$servicePrincipalId = az ad sp show --id http://$servicePrincipalName --query appId --output tsv

Write-Output "Creating kubernetes secret with service principal"
$secretName = Read-Host -Prompt "Secret name"
$dockerEmail = Read-Host -Prompt "Your email"
while (!($secretName -match '^[a-zA-Z0-9,-,_]*$')) {
  Write-Output "Looks like the secret name is invalid"
  $secretName = Read-Host -Prompt "Secret name"
}
kubectl create secret docker-registry $secretName --docker-server $acrResources[1] --docker-username $servicePrincipalId --docker-password $servicePrincipalPassword --docker-email $dockerEmail

Write-Output "Creating public ip adress in kubernetes resource group"
$publicIpAdressName = Read-Host -Prompt "Public ip adress name"
while (!($publicIpAdressName -match '^[a-zA-Z0-9,-,_]*$')) {
  Write-Output "Looks like the public ip adress name is invalid"
  $publicIpAdressName = Read-Host -Prompt "Public ip adress name"
}

$kubernetesResourceGroupName = "MC_" + $resourceGroupName + "_" + $clusterName + "_" + $location
Write-Output "Creating public static ip adress in kubernetes resource group"
az network public-ip create --resource-group $kubernetesResourceGroupName --name $publicIpAdressName --allocation-method Static

Write-Output "Creating storage account in kubernetes resource group"
$storageAccountName = Read-Host -Prompt "Storage account name"
$storageAccountSku = Read-Host -Prompt "Storage account sku"
az storage account create --location $location --name $storageAccountName --resource-group $kubernetesResourceGroupName --sku $storageAccountSku
