#nullable enable
namespace Altinn.Notifications.Core.Services.Interfaces;

/// <summary>
/// Interface describing a dateTime service
/// </summary>
public interface IDateTimeService
{
    /// <summary>
    /// Provides DateTime UtcNow
    /// </summary>
    /// <returns></returns>
    public DateTime UtcNow();
}
