Write-Output "This is will install prometheus and grafana in the cluster, using helm."
Write-Output "If you don't have helm installed on either your client, the server or the correct setup with RBAC in the cluster, this will fail."

helm install stable/prometheus --namespace=prometheus --name=prometheus

helm install -f ./grafana/values.yaml stable/grafana --namespace=grafana --name=grafana
