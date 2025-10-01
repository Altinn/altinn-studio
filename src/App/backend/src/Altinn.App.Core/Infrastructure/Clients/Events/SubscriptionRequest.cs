namespace Altinn.App.Core.Infrastructure.Clients.Events;

/// <summary>
/// Class that describes the events subscription request model
/// </summary>
public class SubscriptionRequest
{
    /// <summary>
    /// Endpoint to receive matching events
    /// </summary>
    public Uri? EndPoint { get; set; }

    /// <summary>
    /// Filter on source
    /// </summary>
    public Uri? SourceFilter { get; set; }

    /// <summary>
    /// Filter for type. The different sources has different types.
    /// </summary>
    public string? TypeFilter { get; set; }
}
