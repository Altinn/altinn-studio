Write-Output "Creating service principal for container registry"
$resourceGroupName = Read-Host -Prompt "Name of the resource group that have the container registry"
$servicePrincipalName = Read-Host -Prompt "Service princpal name"
$acrResources = (az acr list --resource-group $resourceGroupName --query "[0].{id:id,loginServer:loginServer}" --output tsv).split("`t")
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
