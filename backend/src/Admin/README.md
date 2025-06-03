# Admin service

## Running locally

Currently uses [AltinnTestTools](https://github.com/Altinn/AltinnTestTools) to get data from [Storage](https://github.com/Altinn/altinn-storage/) in test environments.
This requires a username and password for basic auth which can be set as user-secrets:

- `dotnet user-secrets set "TestToolsTokenGenerator:Username" "***"`
- `dotnet user-secrets set "TestToolsTokenGenerator:Password" "***"`
