using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using static Altinn.Studio.AppConfig.Parsers.JsonRead;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class OptionsParser
{
    private static readonly string[] _optionTextFields = { "label", "description", "helpText" };

    public static void Parse(AppModelBuilder app, IAppDirectory dir)
    {
        const string optionsDir = "App/options";
        if (!dir.DirectoryExists(optionsDir))
            return;
        foreach (var file in dir.EnumerateFiles(optionsDir, "*.json", recursive: false))
        {
            var name = Path.GetFileNameWithoutExtension(file);
            if (!string.IsNullOrEmpty(name))
                app.OptionsFiles[name] = true;
            CollectFileTextKeys(app, dir, file, name ?? "");
        }
    }

    private static void CollectFileTextKeys(AppModelBuilder app, IAppDirectory dir, string file, string optionsId)
    {
        var data = dir.ReadAllBytes(file);
        if (data is null || !SourceParse.TryJson(app, file, data, out var doc))
            return;
        using var _ = doc;
        if (doc.RootElement.ValueKind != JsonValueKind.Array)
            return;
        int i = 0;
        foreach (var item in doc.RootElement.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.Object)
                foreach (var field in _optionTextFields)
                    if (TryString(item, field) is { } v && LooksLikeTextKey(v))
                        app.Refs.TextResources.Add(
                            new TextResourceReference(v, optionsId, field, new SourceSpan(file, $"/{i}/{field}"))
                        );
            i++;
        }
    }
}
