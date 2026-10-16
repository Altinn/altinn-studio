using System.Text.Json;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;

namespace Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;

public static class UiFolderParser
{
    /// <summary>
    /// Parse a ui folder from its layout files, keyed by page name
    /// </summary>
    public static UiFolderComponent Parse(
        IReadOnlyDictionary<string, JsonElement> layouts,
        string folderName,
        string defaultDataTypeId
    ) => new(layouts.Select(kvp => PageComponent.Parse(kvp.Value, kvp.Key, folderName)), folderName, defaultDataTypeId);
}
