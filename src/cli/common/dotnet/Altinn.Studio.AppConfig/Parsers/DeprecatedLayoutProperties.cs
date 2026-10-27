using System.Text.Json;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class DeprecatedLayoutProperties
{
    private static readonly HashSet<string> _componentsWithoutMapping = new(StringComparer.Ordinal)
    {
        "Checkboxes",
        "Dropdown",
        "FileUpload",
        "Likert",
        "List",
        "MultipleSelect",
        "Option",
        "RadioButtons",
    };

    public static void Collect(AppModelBuilder app, string id, string type, string file, string basePtr, JsonElement c)
    {
        if (_componentsWithoutMapping.Contains(type) && c.TryGetProperty("mapping", out _))
            app.RecordDeprecation(
                "layout.mapping",
                $"{type} \"{id}\" uses mapping, which v9 removed from options components; use queryParameters with dataModel expressions",
                new SourceSpan(file, basePtr + "/mapping")
            );

        if (type == "List" && c.TryGetProperty("bindingToShowInSummary", out _))
            app.RecordDeprecation(
                "layout.bindingToShowInSummary",
                $"List \"{id}\" uses bindingToShowInSummary, which v9 removed; use summaryBinding naming the dataModelBindings key",
                new SourceSpan(file, basePtr + "/bindingToShowInSummary")
            );
    }
}
