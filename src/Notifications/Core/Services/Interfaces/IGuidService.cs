#nullable enable
namespace Altinn.Notifications.Core.Services.Interfaces;

/// <summary>
/// Interface describing a guid service
/// </summary>
public interface IGuidService
{
    /// <summary>
    /// Generates a new Guid
    /// </summary>
    public Guid NewGuid();
}
