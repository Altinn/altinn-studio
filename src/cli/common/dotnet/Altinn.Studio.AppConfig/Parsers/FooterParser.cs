using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using static Altinn.Studio.AppConfig.Parsers.JsonRead;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class FooterParser
{
    public static void Parse(AppModelBuilder app, IAppDirectory dir)
    {
        const string path = "App/ui/footer.json";
        var data = dir.ReadAllBytes(path);
        if (data is null || !SourceParse.TryJson(app, path, data, out var doc))
            return;
        using var _ = doc;
        if (!doc.RootElement.TryGetProperty("footer", out var footerEl) || footerEl.ValueKind != JsonValueKind.Array)
            return;

        int i = 0;
        foreach (var item in footerEl.EnumerateArray())
        {
            if (
                item.ValueKind == JsonValueKind.Object
                && TryString(item, "title") is { } title
                && LooksLikeTextKey(title)
            )
                app.Refs.TextResources.Add(
                    new TextResourceReference(title, "", "footer title", new SourceSpan(path, $"/footer/{i}/title"))
                );
            i++;
        }
    }
}
