#nullable enable
using System.Diagnostics.CodeAnalysis;

using Altinn.Notifications.Core.Services.Interfaces;

namespace Altinn.Notifications.Core.Services;

/// <summary>
/// Implementation of the GuidServiceS
/// </summary>
[ExcludeFromCodeCoverage]
public class GuidService : IGuidService
{
    /// <inheritdoc/>
    public Guid NewGuid()
    {
        return Guid.NewGuid();
    }
}
