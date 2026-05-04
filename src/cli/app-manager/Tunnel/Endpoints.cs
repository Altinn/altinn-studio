namespace Altinn.Studio.AppManager.Tunnel;

internal static class Endpoints
{
    public static RouteGroupBuilder MapTunnelEndpoints(this RouteGroupBuilder api)
    {
        var tunnel = api.MapGroup("/tunnel");
        tunnel.MapPost("/", NotImplemented);
        tunnel.MapDelete("/{id}", NotImplemented);
        return tunnel;
    }

    private static IResult NotImplemented()
    {
        return Results.StatusCode(StatusCodes.Status501NotImplemented);
    }
}
