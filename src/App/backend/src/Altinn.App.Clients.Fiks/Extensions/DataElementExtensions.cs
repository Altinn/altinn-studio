using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.Extensions;

internal static class DataElementExtensions
{
    private static readonly Dictionary<string, string> _mimeTypeToExtensionMapping = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        ["application/xml"] = ".xml",
        ["text/xml"] = ".xml",
        ["application/pdf"] = ".pdf",
        ["application/json"] = ".json",
    };

    /// <summary>
    /// Get the file extension for the data element's content type, or null if unknown.
    /// </summary>
    public static string? GetExtensionForContentType(this DataElement dataElement)
    {
        var mimeType = dataElement.ContentType;
        return mimeType is null ? null : _mimeTypeToExtensionMapping.GetValueOrDefault(mimeType);
    }
}
