using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Flux.Contracts;

namespace StudioGateway.Api.Flux;

public static class FluxWebhookEndpoints
{
    public static WebApplication MapFluxWebhookEndpoint(this WebApplication app)
    {
        app.MapPost("/flux/webhook", HandleFluxWebhook)
        .WithName("FluxWebhook")
        .WithSummary("Receive Flux CD webhook notifications")
        .WithDescription("Endpoint for receiving event notifications from Flux CD controllers")
        .WithTags("Flux");

        return app;
    }

    private static IResult HandleFluxWebhook(FluxEvent fluxEvent, ILogger<Program> logger)
    {
        logger.LogInformation("Received Flux event: {FluxEvent}", fluxEvent);
        return Results.Ok();
    }
}
