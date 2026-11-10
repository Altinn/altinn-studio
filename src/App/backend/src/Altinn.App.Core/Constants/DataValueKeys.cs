namespace Altinn.App.Core.Constants;

/// <summary>
/// Keys for <see cref="Altinn.Platform.Storage.Interface.Models.Instance.DataValues"/> that are set by the app framework.
/// </summary>
public static class DataValueKeys
{
    /// <summary>
    /// The id (<c>{instanceOwnerPartyId}/{instanceGuid}</c>) of the instance that a copied instance was created from.
    /// If the key is listed in <c>CopyInstanceSettings.IncludedDataValues</c>, a copy of a copy keeps the id of the
    /// first instance in the chain instead of the instance it was copied from directly.
    /// </summary>
    public const string CopySourceInstanceId = "copy.sourceInstanceId";
}
