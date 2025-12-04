using StudioGateway.Api.Authentication;
using StudioGateway.Api.Endpoints.Internal.Contracts;
using StudioGateway.Api.Hosting;

namespace StudioGateway.Api.Endpoints.Internal;

internal static class FluxWebhookEndpoints
{
    public static WebApplication MapFluxWebhookEndpoint(this WebApplication app)
    {
        app.MapPost("/api/v1/flux/webhook", HandleFluxWebhook)
            .RequireInternalPort()
            .WithName("FluxWebhook")
            .WithSummary("Receive Flux CD webhook notifications")
            .WithDescription("Endpoint for receiving event notifications from Flux CD controllers")
            .WithTags("Flux");

        return app;
    }

    private static IResult HandleFluxWebhook(
        FluxEvent fluxEvent,
        ILogger<Program> logger,
        MaskinportenClient maskinportenClient
    )
    {
        var token = maskinportenClient.CurrentToken;
        logger.LogInformation(
            "Received Flux event: Event={FluxEvent}, HasToken={HasToken}",
            fluxEvent,
            token is not null
        );
        return Results.Ok();
    }
}
