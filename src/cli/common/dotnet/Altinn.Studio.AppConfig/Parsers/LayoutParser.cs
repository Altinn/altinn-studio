using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class LayoutParser
{
    public static void ParseFile(AppModelBuilder app, IAppDirectory dir, LayoutSetBuilder set, string page, string file)
    {
        var data = dir.ReadAllBytes(file);
        if (data is null)
            return;
        if (!SourceParse.TryJson(app, file, data, out var doc))
            return;
        using var _ = doc;

        if (!doc.RootElement.TryGetProperty("data", out var dataEl))
            return;

        if (dataEl.TryGetProperty("hidden", out var hiddenEl))
            ExpressionWalker.CollectValue(app, ownerId: "", file, "/data/hidden", hiddenEl);

        if (!dataEl.TryGetProperty("layout", out var layoutEl) || layoutEl.ValueKind != JsonValueKind.Array)
            return;

        int i = 0;
        foreach (var c in layoutEl.EnumerateArray())
        {
            ComponentParser.Parse(app, set, page, file, i, c);
            i++;
        }
    }
}
