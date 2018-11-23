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

Write-Output "Setting up the kubernetes cluster..."
az aks create --resource-group $resourceGroupName --name $clusterName --generate-ssh-keys --service-cidr 10.0.0.0/16

Write-Output "Installing kubernetes cli"
az aks install-cli

Write-Output "Connecting to the cluster"
az aks get-credentials --resource-group $resourceGroupName --name $clusterName

Write-Output "Creating postgresql database server"
$databaseServerName = Read-Host -Prompt "Database server name"
$databaseAdminUser = Read-Host -Prompt "Database admin user name"
$databaseAdminPassword = Read-Host -Prompt "Database admin password"
$databaseSKU = "GP_Gen5_32"
$databaseSSLEnforcement = "Enabled"

Write-Output "Setting up postgresql database server..."
az postgres server create -l $location -g $resourceGroupName -n $databaseServerName -u $databaseAdminUser -p $databaseAdminPassword --sku-name $databaseSKU --ssl-enforcement $databaseSSLEnforcement

$databaseServerAdress = $databaseServerName + ".postgres.database.azure.com"
$databaseServerAdminLogin = $databaseAdminUser + "@" + $databaseServerName

$kubernetesResourceGroupName = "MC_" + $resourceGroupName + "_" + $clusterName + "_" + $location

Write-Output "Creating vnet rule on the database server"
$vnetRuleName = Read-Host -Prompt "Name for the vnet rule"
$clusterVnetId = az network vnet list -g $kubernetesResourceGroupName --query "[0].subnets[0].id" -o tsv
az postgres server vnet-rule create -n $vnetRuleName -g $resourceGroupName -s $databaseServerName --subnet $clusterVnetId

Write-Output "Creating database on the database server"
$databaseName = Read-Host -Prompt "Database name"
az postgres db create -n $databaseName -g $resourceGroupName -s $databaseServerName

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

Write-Output "Creating public ip adress in kubernetes resource group"
$publicIpAdressName = Read-Host -Prompt "Public ip adress name"
while (!($publicIpAdressName -match '^[a-zA-Z0-9,-,_]*$')) {
  Write-Output "Looks like the public ip adress name is invalid"
  $publicIpAdressName = Read-Host -Prompt "Public ip adress name"
}

Write-Output "Creating public static ip adress in kubernetes resource group"
az network public-ip create --resource-group $kubernetesResourceGroupName --name $publicIpAdressName --allocation-method Static
