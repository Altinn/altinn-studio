using Altinn.Studio.Designer.Hubs.EntityUpdate;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Hubs;

public static class HubsEndpointExtensions
{
    public static void MapHubs(this IEndpointRouteBuilder endpoints)
    {
        // all hubs should be changed to have endpoint /hubs/hub-name
        endpoints.MapHub<PreviewHub>("/previewHub");
        endpoints.MapHub<SyncHub.SyncHub>("/sync-hub");
        endpoints.MapHub<EntityUpdatedHub>("/hubs/entity-updated");
    }
}
