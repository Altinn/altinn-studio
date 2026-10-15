# Runtime common code

This is code that [Localtest](../localtest/README.md) and [studioctl](../../cli/README.md) share. Code that the
whole repository shares belongs in [`src/common`](../../common).

## .NET

`Altinn.Studio.Runtime.Common` holds two capabilities of the local environment:

- The bound topology is the routing configuration that studioctl generates for Localtest and studioctl-server.
  studioctl writes it with the Go types in [`envtopology`](../../cli/internal/envtopology), and the .NET types read
  it. A change to the format updates both.
- HostBridge is the WebSocket protocol that Localtest uses to forward requests to apps and services on the
  developer's machine. studioctl-server opens the connection, and studioctl
  [configures](../../cli/internal/studioctlserver) it.

Localtest and studioctl-server compile these source files directly, so a change must build in both. Their project
files and Localtest's Dockerfile include each folder by path, so a new folder must be added there.

CI builds the sources only as part of Localtest and studioctl-server. Build the project itself as well, since it
applies its own analyzer settings:

```bash
dotnet build dotnet/Altinn.Studio.Runtime.Common/Altinn.Studio.Runtime.Common.csproj
```
