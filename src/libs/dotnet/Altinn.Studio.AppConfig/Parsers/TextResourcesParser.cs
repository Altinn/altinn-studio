using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class TextResourcesParser
{
    public static void Parse(AppModelBuilder app, IAppDirectory dir)
    {
        const string textsDir = "App/config/texts";
        if (!dir.DirectoryExists(textsDir))
            return;
        foreach (var file in dir.EnumerateFiles(textsDir, "resource.*.json", recursive: false))
        {
            var data = dir.ReadAllBytes(file);
            if (data is null)
                continue;

            if (!SourceParse.TryJson(app, file, data, out var doc))
                continue;
            using var _ = doc;

            var lang = "";
            var ids = new Dictionary<string, SourceSpan>(StringComparer.Ordinal);
            var values = new Dictionary<string, string>(StringComparer.Ordinal);
            if (doc.RootElement.TryGetProperty("language", out var langEl) && langEl.ValueKind == JsonValueKind.String)
            {
                lang = langEl.GetString() ?? "";
            }
            if (doc.RootElement.TryGetProperty("resources", out var resEl) && resEl.ValueKind == JsonValueKind.Array)
            {
                var i = 0;
                foreach (var r in resEl.EnumerateArray())
                {
                    if (r.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String)
                    {
                        var id = idEl.GetString();
                        if (!string.IsNullOrEmpty(id))
                        {
                            ids[id] = new SourceSpan(file, $"/resources/{i}/id");
                            if (JsonRead.TryString(r, "value") is { } value)
                                values[id] = value;
                        }
                    }
                    i++;
                }
            }
            app.TextResources.Add(
                new TextResources
                {
                    Language = lang,
                    Ids = ids.AsReadOnly(),
                    Values = values.AsReadOnly(),
                    Position = new SourceSpan(file, ""),
                }
            );
        }
    }
}
