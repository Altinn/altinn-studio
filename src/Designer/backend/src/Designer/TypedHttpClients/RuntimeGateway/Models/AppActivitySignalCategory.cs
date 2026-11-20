namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

public static class AppActivitySignalCategory
{
    /// <summary>
    /// A POST, PUT, PATCH or DELETE request that did not get a 4xx response.
    /// </summary>
    public const string Write = "write";

    /// <summary>
    /// Any other request to the app.
    /// </summary>
    public const string Read = "read";
}
