namespace Altinn.Notifications.Extensions;

/// <summary>
/// Extensions for HTTP Context
/// </summary>
public static class HttpContextExtensions
{
    /// <summary>
    /// Get the org string from the context items or null if it is not defined
    /// </summary>        
    public static string? GetOrg(this HttpContext context)
    {
        return context.Items["Org"] as string;
    }
}
