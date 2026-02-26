using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.Extensions;

internal static class InstanceExtensions
{
    /// <summary>
    /// Get data elements of a given type from an instance. Returns an empty collection if none are found.
    /// </summary>
    public static IEnumerable<DataElement> GetOptionalDataElements(this Instance instance, string dataType) =>
        instance.Data?.Where(x => x.DataType.Equals(dataType, StringComparison.OrdinalIgnoreCase)) ?? [];

    /// <summary>
    /// Get a required data element of a given type from an instance. Throws an exception if not found.
    /// </summary>
    public static DataElement GetRequiredDataElement(this Instance instance, string dataType) =>
        instance.Data.FirstOrDefault(x => x.DataType.Equals(dataType, StringComparison.OrdinalIgnoreCase))
        ?? throw new FiksArkivException($"Fiks Arkiv error: No data elements found for DataType '{dataType}'");

    /// <summary>
    /// Get the public URL for an instance.
    /// </summary>
    public static string GetInstanceUrl(this Instance instance, GeneralSettings generalSettings)
    {
        var appIdentifier = new AppIdentifier(instance);
        var instanceIdentifier = new InstanceIdentifier(instance);
        var baseUrl = generalSettings.FormattedExternalAppBaseUrl(appIdentifier);

        return $"{baseUrl}instances/{instanceIdentifier}";
    }
}
