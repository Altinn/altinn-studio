#!/bin/sh
set -eu
kubectl wait deployment -n default kuberneteswrapper --for condition=Available=True --timeout=90s
kubectl port-forward svc/kuberneteswrapper 8080:8080 &
PORTFORWARD_PID=$!
trap 'kill $PORTFORWARD_PID' EXIT
sleep 5 # Wait for portforward to be ready
expectedDeployment='[{"version":"alpine","release":"dummy-deployment"},{"version":"local","release":"kuberneteswrapper"}]'
expectedDaemonsets='[{"version":"alpine","release":"dummy-daemonset"}]'
actualDeployment=$(curl http://localhost:8080/api/v1/deployments --silent)
if [ "$expectedDeployment" != "$actualDeployment" ]; then
  echo "Deployment test failed"
  echo "Exp: $expectedDeployment"
  echo "Got: $actualDeployment"
  exit 1
else
  echo "Deployment tests ran OK"
fi

actualDaemonsets=$(curl http://localhost:8080/api/v1/daemonsets --silent)
if [ "$expectedDaemonsets" != "$actualDaemonsets" ]; then
  echo "DaemonsetsTest failed"
  echo "Exp: $expectedDaemonsets"
  echo "Got: $actualDaemonsets"
  exit 1
else
  echo "Daemonsets tests ran OK"
fi
kill $PORTFORWARD_PID
