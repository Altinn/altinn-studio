using System.Text.Json;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using static Altinn.Studio.AppConfig.Parsers.JsonRead;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class OptionTextCollector
{
    private static readonly string[] _optionTextFields = { "label", "description", "helpText" };

    public static void CollectOptionTextKeys(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c
    )
    {
        if (c.TryGetProperty("options", out var opts) && opts.ValueKind == JsonValueKind.Array)
        {
            int i = 0;
            foreach (var opt in opts.EnumerateArray())
            {
                if (opt.ValueKind == JsonValueKind.Object)
                    foreach (var field in _optionTextFields)
                        AddOptionTextRef(app, ownerId, opt, field, file, $"{basePtr}/options/{i}/{field}");
                i++;
            }
        }
        if (c.TryGetProperty("source", out var src) && src.ValueKind == JsonValueKind.Object)
            foreach (var field in _optionTextFields)
                AddOptionTextRef(app, ownerId, src, field, file, $"{basePtr}/source/{field}");
    }

    private static void AddOptionTextRef(
        AppModelBuilder app,
        string ownerId,
        JsonElement obj,
        string field,
        string file,
        string pointer
    )
    {
        if (TryString(obj, field) is { } v && LooksLikeTextKey(v))
            app.Refs.TextResources.Add(new TextResourceReference(v, ownerId, field, new SourceSpan(file, pointer)));
    }
}
