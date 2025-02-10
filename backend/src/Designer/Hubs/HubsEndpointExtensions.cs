using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Altinn.Studio.Designer.Hubs.Preview;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Hubs;

public static class HubsEndpointExtensions
{
    public static void MapHubs(this IEndpointRouteBuilder endpoints)
    {
        // all hubs should have /hubs prefix
        endpoints.MapHub<PreviewHub>("/hubs/preview");
        endpoints.MapHub<Sync.SyncHub>("/hubs/sync");
        endpoints.MapHub<EntityUpdatedHub>("/hubs/entity-updated");
    }
}
