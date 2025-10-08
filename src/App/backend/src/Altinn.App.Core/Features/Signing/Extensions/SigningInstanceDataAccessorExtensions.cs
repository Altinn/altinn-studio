using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Signing.Extensions;

/// <summary>
/// Extension methods for <see cref="IInstanceDataAccessor"/> used in signing.
/// </summary>
internal static class SigningInstanceDataAccessorExtensions
{
    /// <summary>
    /// Overrides the authentication method for all restricted data types in the provided list of data type IDs.
    /// </summary>
    public static void OverrideAuthenticationMethodForRestrictedDataTypes(
        this IInstanceDataAccessor accessor,
        ApplicationMetadata appMetadata,
        string?[] dataTypeIds,
        StorageAuthenticationMethod authenticationMethod
    )
    {
        IEnumerable<DataType> restrictedDataTypes = GetDataTypes(appMetadata, dataTypeIds).Where(IsRestrictedDataType);

        foreach (DataType signatureDataType in restrictedDataTypes)
        {
            accessor.OverrideAuthenticationMethod(signatureDataType, authenticationMethod);
        }
    }

    private static IEnumerable<DataType> GetDataTypes(
        ApplicationMetadata appMetadata,
        IEnumerable<string?> dataTypeIds
    ) => dataTypeIds.Select(dataTypeId => GetDataType(appMetadata, dataTypeId)).OfType<DataType>();

    private static DataType? GetDataType(ApplicationMetadata appMetadata, string? dataTypeId) =>
        dataTypeId is null
            ? null
            : appMetadata.DataTypes.FirstOrDefault(x => x.Id.Equals(dataTypeId, StringComparison.OrdinalIgnoreCase));

    private static bool IsRestrictedDataType([NotNullWhen(true)] DataType? dataType) =>
        !string.IsNullOrWhiteSpace(dataType?.ActionRequiredToRead)
        || !string.IsNullOrWhiteSpace(dataType?.ActionRequiredToWrite);
}
