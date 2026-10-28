# Operator test app

`ttd/localtestapp` stands in for an Altinn app in the operator's e2e tests. The [tester](../cmd/tester) builds its
image and deploys it to the Kind cluster, and the tests call it to check what the operator provides an app, such as
a Maskinporten token and database access.
