
az account set --subscription "Altinn-Test"

Write-Output "This will run you through the deployment of a kubernetes cluster and container repository in a resource group"

#AKS
$resourceGroupName = "altinnstudio-rg"
$location = "westeurope"
$clusterName = "altinnstudio-staging-aks"
$aksNodeSize = "Standard_D2s_v3"
$aksDiskSize = 128
$aksNodeCount = 2
$aksMaxPods = 50
$publicIpAdressName = "altinnstudio-staging-pip01"
$storageAccountName = "altinnstudiostorage02" # update altinncore-storage.yaml with same storageaccountname

$aksServiceCidr = "10.250.0.0/24"
$aksServiceDnsIp = "10.250.0.10"
$aksDockerBridgeAddress = "172.17.0.1/16"

#postgres
$databaseServerName = "altinnstudio-db-staging-postgres"
$databaseAdminUser = "adminuser"
$databaseAdminPassword = "229GBOCvBphG"
$databaseSKU = "GP_Gen5_2"
$databaseSSLEnforcement = "Enabled"
$databaseName = "altinnstudio"

# Image Tag for Designer and Runtime
$altinndesigner_imagetag = "11561"
$altinnruntime_imagetag = "11558"

#Docker secret
$secretName = "acrsecret"
$dockerEmail = "extoot@brreg.no"
#$altinnstudioRegistryName = "altinntjenestercontainerregistry"
$altinnstudioRegistryRG = "altinntjenester-tre-null"
$altinnstudioRegistrySubscription = "Tjenester 3.0"

$aksServicePrincipalName = $clusterName + "-" + (Get-Date).ToString("yyyyMMdd-HHmm")
$ACRservicePrincipalName = "altinnstudio-ACR" + (Get-Date).ToString("yyyyMMdd-HHmm")

$kubernetesResourceGroupName = "MC_" + $resourceGroupName + "_" + $clusterName + "_" + $location

Write-Output "Setting up the resource group..."
az group create --location $location --name $resourceGroupName

#Create Service Prinipal
Write-Output "Create Service Principal..."
$aksServicePrincipal = az ad sp create-for-rbac -n $aksServicePrincipalName --skip-assignment
$aksServicePrincipalId = $aksServicePrincipal.Item(1).split(':')[1].split(',')[0].TrimStart().TrimEnd()
$aksServicePrincipalPassword = $aksServicePrincipal.Item(4).split(':')[1].split(',')[0].TrimStart().TrimEnd()
Start-Sleep -s 30


Write-Output "Setting up the kubernetes cluster..."
az aks create  `
  --resource-group $resourceGroupName `
  --name $clusterName `
  --max-pods $aksMaxPods `
  --service-principal $aksServicePrincipalId `
  --client-secret $aksServicePrincipalPassword `
  --service-cidr $aksServiceCidr `
  --dns-service-ip $aksServiceDnsIp  `
  --docker-bridge-address $aksDockerBridgeAddress `
  --node-count $aksNodeCount `
  --node-vm-size $aksNodeSize `
  --node-osdisk-size $aksDiskSize  `
  --network-plugin azure `
  --generate-ssh-keys

Write-Output "Creating public static IP adress"
az network public-ip create --resource-group $kubernetesResourceGroupName --name $publicIpAdressName --allocation-method Static
$PublicIP = az network public-ip show --resource-group $kubernetesResourceGroupName --name $publicIpAdressName --query ipAddress --output tsv

#Create Storage Account
Write-Output "Create Storage Account..."
az storage account create -n $storageAccountName -g $resourceGroupName -l $location --sku Premium_LRS --kind FileStorage
$storageAccountId = az storage account show -g $resourceGroupName -n $storageAccountName --query "id" --output tsv
az role assignment create --assignee $aksServicePrincipalId --role "Storage Account Contributor" --scope $storageAccountId

Write-Output "Installing kubernetes cli"
az aks install-cli

Write-Output "Connecting to the cluster"
az aks get-credentials --resource-group $resourceGroupName --name $clusterName --overwrite-existing

####
$acrResources = (az acr list --resource-group $altinnstudioRegistryRG --subscription $altinnstudioRegistrySubscription  --query "[0].{id:id,loginServer:loginServer}" --output tsv).split("`t")
$servicePrincipalPassword = az ad sp create-for-rbac --name $ACRservicePrincipalName --role Reader --scopes $acrResources[0] --query password --output tsv
Start-Sleep -s 30
$servicePrincipalId = az ad sp show --id http://$ACRservicePrincipalName --query appId --output tsv
kubectl create secret docker-registry $secretName --docker-server $acrResources[1] --docker-username $servicePrincipalId --docker-password $servicePrincipalPassword --docker-email $dockerEmail

Write-Output "Setting up postgresql database server..."
az postgres server create -l $location -g $resourceGroupName -n $databaseServerName -u $databaseAdminUser -p $databaseAdminPassword --sku-name $databaseSKU --ssl-enforcement $databaseSSLEnforcement


$vnetRuleName = "$databaseServerName-vnet-rule"
$clusterVnetId = az network vnet list -g $kubernetesResourceGroupName --query "[0].subnets[0].id" -o tsv
$clusterSubnetName = az network vnet list -g $kubernetesResourceGroupName --query "[0].subnets[0].name" -o tsv
$clusterVnetName = az network vnet list -g $kubernetesResourceGroupName --query "[0].name" -o tsv

#Add service endpoint to subnet
az network vnet subnet update -g $kubernetesResourceGroupName -n $clusterSubnetName --vnet-name $clusterVnetName --service-endpoints Microsoft.SQL

#Create VNET-Rule
Write-Output "Creating vnet rule on the database server"
az postgres server vnet-rule create -n $vnetRuleName -g $resourceGroupName -s $databaseServerName --subnet $clusterVnetId

Write-Output "Creating database on the database server"
az postgres db create -n $databaseName -g $resourceGroupName -s $databaseServerName

$databaseServerAdress = $databaseServerName + ".postgres.database.azure.com"
$databaseServerAdminLogin = $databaseAdminUser + "@" + $databaseServerName

Write-Output "Creating kubernetes secret with database login credentials"
echo -n $databaseServerAdress > ./databaseAdress
echo -n $databaseServerAdminLogin > ./databaseAdminUsername
echo -n $databaseAdminPassword > ./databaseAdminPassword
echo -n $databaseName > ./databaseName

kubectl create secret generic gitea-db-secret --from-file=./databaseAdress --from-file=./databaseAdminUsername --from-file=./databaseAdminPassword --from-file=./databaseName

rm ./databaseAdress
rm ./databaseAdminUsername
rm ./databaseAdminPassword
rm ./databaseName

kubectl create -f .\azure-rbac.yaml
helm init --service-account tiller

## Upgrade Helm
helm init --upgrade

#kubectl create -f https://raw.githubusercontent.com/Azure/kubernetes-keyvault-flexvol/master/deployment/kv-flexvol-installer.yaml
#kubectl create secret generic kvcreds --from-literal clientid=$aksServicePrincipalId --from-literal clientsecret=$aksServicePrincipalPassword --type=azure/kv
#az role assignment create --role Reader --assignee $aksServicePrincipalId --scope /subscriptions/3c9e4058-2413-4fce-8c08-30b074008f1a/resourceGroups/altinntjenester-tre-null/providers/Microsoft.KeyVault/vaults/altinn-studio
#az keyvault set-policy -n $KV_NAME --certificate-permissions get --spn $aksServicePrincipalId --subscription "3c9e4058-2413-4fce-8c08-30b074008f1a"
#az keyvault set-policy -n $KV_NAME --secret-permissions get --spn $aksServicePrincipalId --subscription "3c9e4058-2413-4fce-8c08-30b074008f1a"

#kubectl create -f ./nginx-flex-kv.yaml

#az keyvault certificate download --vault-name $KV_NAME --subscription "3c9e4058-2413-4fce-8c08-30b074008f1a" --name "altinn-studio" -f cert.pem -e PEM

az keyvault certificate download --id "https://altinn-studio.vault.azure.net/certificates/star-altinn-studio" --name "altinn-studio" -f ./ssl-secret/dhparam.pem -e PEM
az keyvault certificate download --id "https://altinn-studio.vault.azure.net/certificates/star-altinn-studio" --name "altinn-studio" -f ./ssl-secret/ssl-bundle.crt -e DER

az keyvault certificate list --vault-name $KV_NAME --subscription "3c9e4058-2413-4fce-8c08-30b074008f1a"


### Adding secrets
kubectl create secret generic ssl-key-secret --from-file=./ssl-secret/altinn.studio.rsa --from-file=./ssl-secret/dhparam.pem --from-file=./ssl-secret/ssl-bundle.crt
#kubectl delete secret ssl-key-secret

#openssl pkcs12 -in altinn-studio-star-altinn-studio-20190826 -out test02.pem -nokeys

kubectl apply -f .\git-db-secret.yaml
kubectl apply -f .\gitea-security.yaml
kubectl apply -f .\gitea-server-jwt-secret.yaml
kubectl apply -f .\altinn-appsettings-secret.yaml
Start-Sleep -s 30
kubectl apply -f .\altinncore-storage.yaml #check storage accountname
Start-Sleep -s 30
kubectl apply -f .\altinncore-loadbalancer-dev-config.yaml


helm install ./helm-charts/altinn-repositories --set "environment=staging"
helm install ./helm-charts/altinn-designer --set "environment=staging,image.tag=$altinndesigner_imagetag"
helm install ./helm-charts/altinn-runtime --set "environment=staging,image.tag=$altinnruntime_imagetag"
helm install stable/prometheus --namespace=prometheus --name=prometheus
helm install -f ./monitoring\grafana/values-dev.yaml stable/grafana --namespace=grafana --name=grafana
helm install ./helm-charts/altinn-loadbalancer --set "environment=development,loadBalancerIP=$PublicIP"

## Enable live logging feature
kubectl create -f LogReaderRBAC.yaml
