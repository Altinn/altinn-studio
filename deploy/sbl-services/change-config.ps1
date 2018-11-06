Write-Output "This will change kubernetes config to another cluster (in azure)"

$resourceGroupName = Read-Host -Prompt "Azure Resource Group"
$clusterName = Read-Host -Prompt "Name of the Kubernetes cluster"

az aks get-credentials -g $resourceGroupName -n $clusterName