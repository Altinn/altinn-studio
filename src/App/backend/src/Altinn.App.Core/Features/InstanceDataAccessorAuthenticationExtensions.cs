using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Helper extensions for configuring authentication used by <see cref="IInstanceDataAccessor"/> /
/// <see cref="IInstanceDataMutator"/> when talking to Storage.
/// </summary>
public static class InstanceDataAccessorAuthenticationExtensions
{
    /// <summary>
    /// Sets the same <see cref="StorageAuthenticationMethod"/> for all data types in this accessor.
    /// Intended for backend/background contexts where no user token is available
    /// (for example process engine callbacks).
    /// </summary>
    /// <param name="accessor">The accessor to configure.</param>
    /// <param name="authenticationMethod">The authentication method to use for all data types.</param>
    public static void UseAuthenticationForAllDataTypes(
        this IInstanceDataAccessor accessor,
        StorageAuthenticationMethod authenticationMethod
    )
    {
        ArgumentNullException.ThrowIfNull(accessor);

        foreach (DataType dataType in accessor.DataTypes)
        {
            accessor.OverrideAuthenticationMethod(dataType, authenticationMethod);
        }
    }
}
