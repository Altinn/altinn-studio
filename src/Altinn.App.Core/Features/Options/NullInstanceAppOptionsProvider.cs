using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// Nullobject for cases where there is no match on the requested <see cref="IInstanceAppOptionsProvider"/>
/// Options is set to null and not an empty list for the controller to be able to differensiate
/// between option provider found, but with no values and no option provider found ie. returns 404.
/// </summary>
public class NullInstanceAppOptionsProvider : IInstanceAppOptionsProvider
{
    /// <inheritdoc/>
    public string Id => string.Empty;

    /// <inheritdoc/>
    public Task<AppOptions> GetInstanceAppOptionsAsync(
        InstanceIdentifier instanceIdentifier,
        string? language,
        Dictionary<string, string> keyValuePairs
    )
    {
        return Task.FromResult<AppOptions>(new AppOptions() { IsCacheable = false, Options = null });
    }
}
