using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.Extensions;

internal static class DataElementExtensions
{
    /// <summary>
    /// Removes from the unit of work every data element the given settings would write, so the caller can stage a
    /// single replacement. Returns what was removed, for the caller to log. What identifies "the element these
    /// settings own" is the pair (data type, resolved filename), not the element id — the archive record and the
    /// confirmation record are allowed to share a data type.
    /// </summary>
    public static IReadOnlyList<DataElement> RemoveDataElementsFor(
        this IInstanceDataMutator dataMutator,
        FiksArkivDataTypeSettings settings
    )
    {
        string filename = settings.GetFilenameOrDefault();
        List<DataElement> existing =
        [
            .. dataMutator.Instance.GetOptionalDataElements(settings.DataType).Where(x => x.Filename == filename),
        ];

        foreach (DataElement dataElement in existing)
        {
            dataMutator.RemoveDataElement(dataElement);
        }

        return existing;
    }

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
