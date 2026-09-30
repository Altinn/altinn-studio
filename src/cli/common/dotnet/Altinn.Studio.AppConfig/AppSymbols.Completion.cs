using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Parsers;

namespace Altinn.Studio.AppConfig;

public sealed partial class AppSymbols
{
    private const int PreviewMaxLength = 40;

    public IReadOnlyList<Suggestion> Completions(
        string file,
        int line,
        int col,
        MarkupFormat format = MarkupFormat.Markdown
    )
    {
        if (_config.ResolveNodeAt(file, line, col) is not { } node)
            return Array.Empty<Suggestion>();

        var model = _config.Current;
        if (node.Pointer.Contains("/dataModelBindings/", StringComparison.Ordinal))
        {
            if (node.Pointer.EndsWith("/dataType", StringComparison.Ordinal))
                return DataTypeSuggestions(model);
            return DataModelSuggestions(model, EffectiveSchemaAt(model, file, node.Pointer), format);
        }
        if (node.Pointer.Contains("/textResourceBindings/", StringComparison.Ordinal))
        {
            var keys = new SortedSet<string>(StringComparer.Ordinal);
            foreach (var tr in model.TextResources)
            {
                foreach (var k in tr.Ids.Keys)
                    keys.Add(k);
            }
            return keys.Select(k => TextKeySuggestion(model, k, "text resource", format)).ToList();
        }

        if (ExpressionArgSuggestions(model, file, node.Pointer, format) is { } expr)
            return expr;

        foreach (var r in model.Refs.ComponentIds)
            if (Same(r.Position, file, node.Pointer))
            {
                var set = r.InTaskId is { } task
                    ? model.LayoutSetForTask(task)
                    : model.LayoutSets.FirstOrDefault(s =>
                        string.Equals(s.Id, AppPaths.SetIdOf(r.Position.File), StringComparison.Ordinal)
                    );
                var subforms = model
                    .ScopesOf(r)
                    .Skip(1)
                    .SelectMany(scope =>
                        model.LayoutSets.Where(s => string.Equals(s.Id, scope, StringComparison.Ordinal))
                    );
                var ids = (
                    set is null
                        ? model.LayoutSets.SelectMany(s => s.AllComponents)
                        : subforms.Prepend(set).SelectMany(s => s.AllComponents)
                ).Select(comp => comp.Id);
                return ids.Distinct(StringComparer.Ordinal)
                    .OrderBy(v => v, StringComparer.Ordinal)
                    .Select(v => new Suggestion(v, "component", SuggestionKind.Component))
                    .ToList();
            }
        foreach (var r in model.Refs.PageFiles)
            if (Same(r.Position, file, node.Pointer))
            {
                string? dir;
                if (r.InTaskId is { } task)
                    dir = model.LayoutSetForTask(task) is { } s ? "App/ui/" + s.Id + "/layouts" : null;
                else
                    dir = "App/ui/" + AppPaths.SetIdOf(r.Position.File) + "/layouts";
                var pages = model
                    .LayoutFiles.Where(f => dir is null || f.StartsWith(dir + "/", StringComparison.Ordinal))
                    .Select(f => Path.GetFileNameWithoutExtension(f) ?? "");
                return pages
                    .Distinct(StringComparer.Ordinal)
                    .OrderBy(v => v, StringComparer.Ordinal)
                    .Select(v => new Suggestion(v, "page", SuggestionKind.Page))
                    .ToList();
            }
        foreach (var r in model.Refs.TaskIds)
            if (Same(r.Position, file, node.Pointer))
                return model
                    .Tasks.Select(t => t.Id)
                    .Distinct(StringComparer.Ordinal)
                    .OrderBy(v => v, StringComparer.Ordinal)
                    .Select(v => new Suggestion(v, "task", SuggestionKind.Task))
                    .ToList();
        return Array.Empty<Suggestion>();
    }

    private IReadOnlyList<Suggestion>? ExpressionArgSuggestions(
        AppModel model,
        string file,
        string ptr,
        MarkupFormat format
    )
    {
        var slash = ptr.LastIndexOf('/');
        if (slash < 0 || !int.TryParse(ptr[(slash + 1)..], out var argIndex) || argIndex < 1)
            return null;
        if (ParseFile(file) is not { } doc)
            return null;
        using var _ = doc;
        if (
            Navigate(doc.RootElement, ptr[..slash]) is not { ValueKind: JsonValueKind.Array } arr
            || arr.GetArrayLength() == 0
            || arr[0].ValueKind != JsonValueKind.String
            || ExpressionWalker.RefArgKindAt(arr[0].GetString() ?? "", argIndex) is not { } kind
        )
            return null;

        switch (kind)
        {
            case ExpressionWalker.RefKind.DataModelPath:
            {
                var dataType =
                    arr.GetArrayLength() > 2 && arr[2].ValueKind == JsonValueKind.String
                        ? arr[2].GetString()
                        : BindingResolver.DefaultDataTypeFor(model, AppPaths.SetIdOf(file));
                return DataModelSuggestions(model, SchemaScopeFor(model, dataType), format);
            }
            case ExpressionWalker.RefKind.DataType:
                return DataTypeSuggestions(model);
            case ExpressionWalker.RefKind.Component:
            {
                var set = model.LayoutSets.FirstOrDefault(s =>
                    string.Equals(s.Id, AppPaths.SetIdOf(file), StringComparison.Ordinal)
                );
                return (set?.AllComponents ?? model.LayoutSets.SelectMany(s => s.AllComponents))
                    .Select(c => c.Id)
                    .Distinct(StringComparer.Ordinal)
                    .OrderBy(v => v, StringComparer.Ordinal)
                    .Select(v => new Suggestion(v, "component", SuggestionKind.Component))
                    .ToList();
            }
            case ExpressionWalker.RefKind.Page:
            {
                var setId = AppPaths.SetIdOf(file);
                var dir = setId.Length > 0 ? "App/ui/" + setId + "/layouts/" : null;
                return model
                    .LayoutFiles.Where(f => dir is null || f.StartsWith(dir, StringComparison.Ordinal))
                    .Select(f => Path.GetFileNameWithoutExtension(f) ?? "")
                    .Distinct(StringComparer.Ordinal)
                    .OrderBy(v => v, StringComparer.Ordinal)
                    .Select(v => new Suggestion(v, "page", SuggestionKind.Page))
                    .ToList();
            }
            case ExpressionWalker.RefKind.TextKey:
            {
                var keys = new SortedSet<string>(StringComparer.Ordinal);
                foreach (var tr in model.TextResources)
                {
                    foreach (var k in tr.Ids.Keys)
                        keys.Add(k);
                }
                var list = keys.Select(k => TextKeySuggestion(model, k, "text resource", format)).ToList();
                list.AddRange(
                    BuiltinTextKeys
                        .Keys.Where(k => !keys.Contains(k))
                        .OrderBy(k => k, StringComparer.Ordinal)
                        .Select(k => TextKeySuggestion(model, k, "built-in text", format))
                );
                return list;
            }
            case ExpressionWalker.RefKind.OptionsId:
            {
                var ids = new SortedSet<string>(StringComparer.Ordinal);
                foreach (var id in model.OptionsFiles.Keys)
                    ids.Add(id);
                foreach (var id in model.OptionsProviders)
                    ids.Add(id);
                return ids.Select(v => new Suggestion(v, "option list", SuggestionKind.OptionsId)).ToList();
            }
        }
        return null;
    }

    private static List<Suggestion> DataModelSuggestions(AppModel model, SchemaScope schema, MarkupFormat format) =>
        schema
            .Properties.OrderBy(kv => kv.Key, StringComparer.Ordinal)
            .Select(kv => new Suggestion(
                kv.Key,
                kv.Value,
                SuggestionKind.DataModelPath,
                Card(
                    format,
                    DataModelHover(model, new Symbol(SymbolKind.DataModelPath, kv.Key, schema.DataType), format)
                )
            ))
            .ToList();

    private static Suggestion TextKeySuggestion(AppModel model, string key, string detail, MarkupFormat format) =>
        new(
            key,
            detail,
            SuggestionKind.TextKey,
            Card(format, TextKeyHover(model, new Symbol(SymbolKind.TextKey, key), format)),
            TextPreview(model, key)
        );

    private static string? TextPreview(AppModel model, string key)
    {
        var byPreference = model
            .TextResources.OrderBy(t => PreviewRank(t.Language))
            .ThenBy(t => t.Language, StringComparer.Ordinal);
        foreach (var tr in byPreference)
            if (
                tr.Values.TryGetValue(key, out var value)
                && SingleLine(value, PreviewMaxLength) is { Length: > 0 } preview
            )
                return preview;
        return null;
    }

    private static int PreviewRank(string language) =>
        language switch
        {
            "nb" => 0,
            "en" => 1,
            _ => 2,
        };

    private static List<Suggestion> DataTypeSuggestions(AppModel model) =>
        model
            .DataTypes.Select(d => new Suggestion(
                d.Id,
                string.IsNullOrEmpty(d.ClassRef) ? "data type" : d.ClassRef,
                SuggestionKind.DataType
            ))
            .OrderBy(s => s.Label, StringComparer.Ordinal)
            .ToList();

    private static JsonElement? Navigate(JsonElement el, string pointer)
    {
        if (pointer.Length == 0)
            return el;
        foreach (var raw in pointer.Split('/').Skip(1))
        {
            var seg = raw.Replace("~1", "/", StringComparison.Ordinal).Replace("~0", "~", StringComparison.Ordinal);
            if (el.ValueKind == JsonValueKind.Object)
            {
                if (!el.TryGetProperty(seg, out el))
                    return null;
            }
            else if (
                el.ValueKind == JsonValueKind.Array
                && int.TryParse(seg, out var i)
                && i >= 0
                && i < el.GetArrayLength()
            )
                el = el[i];
            else
                return null;
        }
        return el;
    }

    private static IReadOnlyDictionary<string, string> EffectiveSchema(AppModel model, DataModelReference r) =>
        SchemaScopeFor(model, BindingResolver.Resolve(model, r)).Properties;

    private SchemaScope EffectiveSchemaAt(AppModel model, string file, string pointer)
    {
        foreach (var r in model.Refs.DataModel)
            if (Same(r.Position, file, pointer))
                return SchemaScopeFor(model, BindingResolver.Resolve(model, r));
        var explicitDataType = ExplicitDataTypeOfBindingAt(file, pointer);
        return SchemaScopeFor(
            model,
            string.IsNullOrEmpty(explicitDataType)
                ? BindingResolver.DefaultDataTypeFor(model, AppPaths.SetIdOf(file))
                : explicitDataType
        );
    }

    private string? ExplicitDataTypeOfBindingAt(string file, string pointer)
    {
        if (!pointer.EndsWith("/field", StringComparison.Ordinal) || ParseFile(file) is not { } doc)
            return null;
        using var _ = doc;
        return
            Navigate(doc.RootElement, pointer[..pointer.LastIndexOf('/')])
                is { ValueKind: JsonValueKind.Object } binding
            && binding.TryGetProperty("dataType", out var dataType)
            && dataType.ValueKind == JsonValueKind.String
            ? dataType.GetString()
            : null;
    }

    private JsonDocument? ParseFile(string file)
    {
        var bytes = _config.ReadAllBytes(file);
        if (bytes is null)
            return null;
        try
        {
            return JsonDocument.Parse(bytes, JsonRead.AppFileOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static SchemaScope SchemaScopeFor(AppModel model, string? dataType) =>
        dataType is { Length: > 0 } && BindingResolver.SchemaFor(model, dataType) is { } props
            ? new SchemaScope(dataType, props)
            : new SchemaScope("", model.SchemaProperties);

    private readonly record struct SchemaScope(string DataType, IReadOnlyDictionary<string, string> Properties);
}

public enum SuggestionKind
{
    DataModelPath,
    TextKey,
    DataType,
    Component,
    Page,
    Task,
    OptionsId,
}

public enum MarkupFormat
{
    Markdown,
    PlainText,
}

public sealed record Suggestion(
    string Label,
    string Detail,
    SuggestionKind Kind,
    string? Documentation = null,
    string? Preview = null
);
