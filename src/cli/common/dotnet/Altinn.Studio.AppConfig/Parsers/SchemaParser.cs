using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class SchemaParser
{
    private static readonly string[] _combinators = { "allOf", "oneOf", "anyOf" };

    private const int MaxRefDepth = 8;

    private sealed class WalkContext
    {
        public required AppModelBuilder App;
        public required string File;
        public required Dictionary<string, string> FileProps;
        public required JsonElement Root;
        public readonly Dictionary<string, int> DepthByRef = new(StringComparer.Ordinal);
        public bool DepthNoteEmitted;
    }

    public static void Parse(AppModelBuilder app, IAppDirectory dir)
    {
        const string modelsDir = "App/models";
        if (!dir.DirectoryExists(modelsDir))
            return;
        var classRefs = ReadClassRefs(dir);
        foreach (var file in dir.EnumerateFiles(modelsDir, "*.schema.json", recursive: false))
        {
            var data = dir.ReadAllBytes(file);
            if (data is null)
                continue;
            if (!SourceParse.TryJson(app, file, data, out var doc))
                continue;
            using var _ = doc;
            if (!app.SchemaPropertiesByFile.TryGetValue(file, out var fileProps))
                app.SchemaPropertiesByFile[file] = fileProps = new(StringComparer.Ordinal);
            var ctx = new WalkContext
            {
                App = app,
                File = file,
                FileProps = fileProps,
                Root = doc.RootElement,
            };
            var (startNode, startPointer) = ModelRoot(doc.RootElement, classRefs.GetValueOrDefault(DataTypeOf(file)));
            ExpandInto(ctx, prefix: "", pointer: startPointer, node: startNode);
        }
    }

    private static string DataTypeOf(string file)
    {
        var name = Path.GetFileName(file);
        const string suffix = ".schema.json";
        return name.EndsWith(suffix, StringComparison.Ordinal) ? name[..^suffix.Length] : name;
    }

    private static (JsonElement Node, string Pointer) ModelRoot(JsonElement schema, string? classRef)
    {
        var rootRef = RootElementPath(schema, classRef);
        if (
            !string.IsNullOrEmpty(rootRef)
            && RefToPointer(rootRef) is { } target
            && Resolve(schema, target) is { } resolved
        )
            return (resolved, target);
        return (schema, "");
    }

    private static string RootElementPath(JsonElement schema, string? classRef)
    {
        if (schema.TryGetProperty("info", out var info) && info.ValueKind == JsonValueKind.Object)
        {
            if (info.TryGetProperty("rootNode", out var rn) && rn.ValueKind == JsonValueKind.String)
                return rn.GetString() ?? "";
            if (
                info.TryGetProperty("meldingsnavn", out var mn)
                && mn.ValueKind == JsonValueKind.String
                && mn.GetString() is { Length: > 0 } melding
                && schema.TryGetProperty("properties", out var props)
                && props.ValueKind == JsonValueKind.Object
                && props.TryGetProperty(melding, out var wrap)
                && wrap.ValueKind == JsonValueKind.Object
                && wrap.TryGetProperty("$ref", out var wref)
                && wref.ValueKind == JsonValueKind.String
            )
                return wref.GetString() ?? "";
        }
        var cr = classRef?.Replace("Altinn.App.Models.", "", StringComparison.Ordinal);
        if (!string.IsNullOrEmpty(cr))
        {
            if (HasDefinition(schema, "$defs", cr))
                return $"#/$defs/{cr}";
            if (HasDefinition(schema, "definitions", cr))
                return $"#/definitions/{cr}";
        }
        return "";
    }

    private static bool HasDefinition(JsonElement schema, string container, string name) =>
        schema.TryGetProperty(container, out var c)
        && c.ValueKind == JsonValueKind.Object
        && c.TryGetProperty(name, out _);

    private static Dictionary<string, string> ReadClassRefs(IAppDirectory dir)
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        var data = dir.ReadAllBytes("App/config/applicationmetadata.json");
        if (data is null)
            return map;
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(data);
        }
        catch (JsonException)
        {
            return map;
        }
        using (doc)
        {
            if (
                doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty("dataTypes", out var dts)
                && dts.ValueKind == JsonValueKind.Array
            )
                foreach (var dt in dts.EnumerateArray())
                {
                    if (
                        dt.ValueKind == JsonValueKind.Object
                        && dt.TryGetProperty("id", out var idEl)
                        && idEl.ValueKind == JsonValueKind.String
                        && idEl.GetString() is { Length: > 0 } id
                        && dt.TryGetProperty("appLogic", out var al)
                        && al.ValueKind == JsonValueKind.Object
                        && al.TryGetProperty("classRef", out var crEl)
                        && crEl.ValueKind == JsonValueKind.String
                        && crEl.GetString() is { Length: > 0 } cr
                    )
                        map[id] = cr;
                }
        }
        return map;
    }

    private static void WalkNode(WalkContext ctx, string path, string pointer, JsonElement node)
    {
        var type = ResolveType(node, ctx.Root);
        ctx.App.SchemaProperties[path] = type;
        ctx.FileProps[path] = type;
        ctx.App.SchemaPropertyPositions[path] = new SourceSpan(ctx.File, pointer, Key: true);
        ExpandInto(ctx, path, pointer, node);
    }

    private static void ExpandInto(WalkContext ctx, string prefix, string pointer, JsonElement node)
    {
        if (node.ValueKind != JsonValueKind.Object)
            return;

        if (TryRef(node, out var refStr))
        {
            if (RefToPointer(refStr) is not { } target || Resolve(ctx.Root, target) is not { } resolved)
                return;
            var depth = ctx.DepthByRef.GetValueOrDefault(target);
            if (depth >= MaxRefDepth)
            {
                NoteDepthCap(ctx, prefix, pointer);
                return;
            }
            ctx.DepthByRef[target] = depth + 1;
            ExpandInto(ctx, prefix, target, resolved);
            ctx.DepthByRef[target] = depth;
            return;
        }

        foreach (var keyword in _combinators)
        {
            if (!node.TryGetProperty(keyword, out var branches) || branches.ValueKind != JsonValueKind.Array)
                continue;
            var i = 0;
            foreach (var branch in branches.EnumerateArray())
                ExpandInto(ctx, prefix, $"{pointer}/{keyword}/{i++}", branch);
        }

        if (
            ResolveType(node, ctx.Root) == "array"
            && node.TryGetProperty("items", out var items)
            && items.ValueKind == JsonValueKind.Object
        )
            ExpandInto(ctx, prefix, pointer + "/items", items);

        if (node.TryGetProperty("properties", out var props) && props.ValueKind == JsonValueKind.Object)
            foreach (var p in props.EnumerateObject())
            {
                var childPath = prefix.Length == 0 ? p.Name : prefix + "." + p.Name;
                WalkNode(ctx, childPath, pointer + "/properties/" + JsonPointerEscaping.Escape(p.Name), p.Value);
            }
    }

    private static void NoteDepthCap(WalkContext ctx, string prefix, string pointer)
    {
        if (ctx.DepthNoteEmitted)
            return;
        ctx.DepthNoteEmitted = true;
        ctx.App.RecordCoverageGap(
            "schema-recursion-depth",
            $"recursive model in {ctx.File} expanded to depth {MaxRefDepth} (at \"{prefix}\"); deeper bindings are not path-checked",
            new SourceSpan(ctx.File, pointer)
        );
    }

    private static string ResolveType(JsonElement node, JsonElement root)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        while (node.ValueKind == JsonValueKind.Object)
        {
            if (node.TryGetProperty("type", out var t))
            {
                if (t.ValueKind == JsonValueKind.String)
                    return t.GetString() ?? "unknown";
                if (t.ValueKind == JsonValueKind.Array)
                    return PrimaryType(t);
            }
            if (TryRef(node, out var r) && RefToPointer(r) is { } tp && seen.Add(tp) && Resolve(root, tp) is { } target)
            {
                node = target;
                continue;
            }
            return "unknown";
        }
        return "unknown";
    }

    private static string PrimaryType(JsonElement typeArray)
    {
        foreach (var entry in typeArray.EnumerateArray())
            if (
                entry.ValueKind == JsonValueKind.String
                && entry.GetString() is { } s
                && !string.Equals(s, "null", StringComparison.Ordinal)
            )
                return s;
        return "unknown";
    }

    private static bool TryRef(JsonElement node, out string @ref)
    {
        if (node.TryGetProperty("$ref", out var r) && r.ValueKind == JsonValueKind.String)
        {
            @ref = r.GetString() ?? "";
            return @ref.Length > 0;
        }
        @ref = "";
        return false;
    }

    private static string? RefToPointer(string @ref) => @ref.StartsWith('#') ? @ref[1..] : null;

    private static JsonElement? Resolve(JsonElement root, string pointer)
    {
        if (pointer.Length == 0)
            return root;
        var cur = root;
        foreach (var rawSeg in pointer.Split('/', StringSplitOptions.RemoveEmptyEntries))
        {
            var seg = JsonPointerEscaping.Unescape(rawSeg);
            if (cur.ValueKind != JsonValueKind.Object || !cur.TryGetProperty(seg, out var next))
                return null;
            cur = next;
        }
        return cur;
    }
}
