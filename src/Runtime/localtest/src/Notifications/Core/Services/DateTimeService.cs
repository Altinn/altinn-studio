#nullable disable

using System.Diagnostics.CodeAnalysis;

using Altinn.Notifications.Core.Services.Interfaces;

namespace Altinn.Notifications.Core.Services;

/// <summary>
/// Implementation of a dateTime service
/// </summary>
[ExcludeFromCodeCoverage]
public class DateTimeService : IDateTimeService
{
    /// <inheritdoc/>
    public DateTime UtcNow()
    {
        return DateTime.UtcNow;
    }
}
