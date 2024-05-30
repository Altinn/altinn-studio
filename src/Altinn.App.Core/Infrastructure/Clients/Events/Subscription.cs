namespace Altinn.App.Core.Infrastructure.Clients.Events;

/// <summary>
/// Class that describes an events subscription
/// </summary>
public class Subscription
{
    /// <summary>
    /// Subscription Id
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Endpoint to receive matching events
    /// </summary>
    public Uri? EndPoint { get; set; }

    /// <summary>
    /// Filter on source
    /// </summary>
    public Uri? SourceFilter { get; set; }

    /// <summary>
    /// Filter on subject
    /// </summary>
    public string? SubjectFilter { get; set; }

    /// <summary>
    /// Filter on alternative subject
    /// </summary>
    public string? AlternativeSubjectFilter { get; set; }

    /// <summary>
    /// Filter for type. The different sources has different types.
    /// </summary>
    public string? TypeFilter { get; set; }

    /// <summary>
    /// The events consumer
    /// </summary>
    public string? Consumer { get; set; }

    /// <summary>
    /// Who created this subscription
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// When subscription was created
    /// </summary>
    public DateTime Created { get; set; }
}
