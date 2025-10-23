# Crypto ops using
# https://github.com/smallstep/cli
# for linkerd mTLS setup

root-cert:
  step certificate create root.linkerd.cluster.local ca.crt ca.key --profile root-ca --no-password --insecure --not-after=876600h

intermediate-cert:
  step certificate create identity.linkerd.cluster.local issuer.crt issuer.key --profile intermediate-ca --not-after 876600h --no-password --insecure --ca ca.crt --ca-key ca.key
