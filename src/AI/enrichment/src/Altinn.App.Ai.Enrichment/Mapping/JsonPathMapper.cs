using System.Text.Json;
using Altinn.App.Ai.Enrichment.Registries;

namespace Altinn.App.Ai.Enrichment.Mapping;

/// <summary>
/// Generic data mapper driven by a JSON spec from <c>config/mappings/&lt;name&gt;.json</c>.
/// The image ships no application-specific projection logic; mappings live
/// alongside the templates they feed.
///
/// Spec shape: an output template where each value is either a nested object
/// (recursed into) or a leaf with a <c>kind</c> property naming one of the
/// primitives in <see cref="LeafKind"/>. Source paths use dotted-segment
/// notation with <c>[n]</c> for array indices, resolved against the input
/// FlatData document.
///
/// Primitives are intentionally minimal — anything that needs conditional
/// branching beyond <c>switch</c> or fallback-chains belongs in the rule
/// markdown an agent reads, not in a deterministic projection layer.
/// </summary>
public sealed class JsonPathMapper : IDataMapper
{
    private readonly JsonElement _spec;
    private readonly RegistryProvider _registries;
    private readonly Func<DateTime> _utcNow;

    public JsonPathMapper(string specFilePath, RegistryProvider registries, Func<DateTime>? utcNow = null)
    {
        if (!File.Exists(specFilePath))
            throw new FileNotFoundException($"Mapping spec not found: {specFilePath}");

        _spec = JsonDocument.Parse(File.ReadAllText(specFilePath)).RootElement.Clone();
        _registries = registries;
        _utcNow = utcNow ?? (() => DateTime.UtcNow);
    }

    public JsonDocument Map(JsonElement flatData)
    {
        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream))
        {
            WriteNode(writer, GetOutput(_spec), flatData, flatData);
            writer.Flush();
        }
        stream.Position = 0;
        return JsonDocument.Parse(stream);
    }

    private static JsonElement GetOutput(JsonElement spec)
    {
        if (spec.ValueKind != JsonValueKind.Object || !spec.TryGetProperty("output", out var output))
            throw new InvalidOperationException("Mapping spec must have a top-level 'output' object.");
        return output;
    }

    /// <summary>
    /// Recursively writes a node: leaf (object with "kind") or nested object.
    /// <paramref name="item"/> is the current iteration item (== root outside
    /// of array iteration); leaves resolve relative paths against it.
    /// </summary>
    private void WriteNode(Utf8JsonWriter writer, JsonElement node, JsonElement root, JsonElement item)
    {
        if (node.ValueKind == JsonValueKind.Object && node.TryGetProperty("kind", out _))
        {
            WriteLeaf(writer, node, root, item);
            return;
        }

        if (node.ValueKind == JsonValueKind.Object)
        {
            writer.WriteStartObject();
            foreach (var prop in node.EnumerateObject())
            {
                writer.WritePropertyName(prop.Name);
                WriteNode(writer, prop.Value, root, item);
            }
            writer.WriteEndObject();
            return;
        }

        // Bare literal in the spec → write through (handy for fixed array entries)
        node.WriteTo(writer);
    }

    private void WriteLeaf(Utf8JsonWriter writer, JsonElement spec, JsonElement root, JsonElement item)
    {
        var kind = spec.GetProperty("kind").GetString()
            ?? throw new InvalidOperationException("Leaf spec is missing 'kind'.");

        switch (kind)
        {
            case "const":         WriteConst(writer, spec); break;
            case "today":         writer.WriteStringValue(_utcNow().ToString("yyyy-MM-dd")); break;
            case "path":          WritePath(writer, spec, item); break;
            case "chain":         WriteChain(writer, spec, item); break;
            case "coalesce":      WriteCoalesce(writer, spec, root, item); break;
            case "switch":        WriteSwitch(writer, spec, item); break;
            case "concat":        WriteConcat(writer, spec, root, item); break;
            case "boolean":       WriteBoolean(writer, spec, item); break;
            case "int":           WriteInt(writer, spec, item); break;
            case "registry_field": WriteRegistryField(writer, spec, item); break;
            case "rule_match":    WriteRuleMatch(writer, spec, item); break;
            case "mapping":       WriteMapping(writer, spec, item); break;
            case "object_if_present":  WriteObjectIfPresent(writer, spec, root, item); break;
            case "list_concat":   WriteListConcat(writer, spec, root, item); break;
            case "list_map":      WriteListMap(writer, spec, root, item); break;
            case "list_pluck":    WriteListPluck(writer, spec, item); break;
            case "list_const":    WriteListConst(writer, spec); break;
            default:
                throw new InvalidOperationException($"Unknown mapping kind: '{kind}'.");
        }
    }

    // --- Leaf primitives ------------------------------------------------------

    private static void WriteConst(Utf8JsonWriter writer, JsonElement spec)
    {
        if (!spec.TryGetProperty("value", out var value))
            throw new InvalidOperationException("'const' requires 'value'.");
        value.WriteTo(writer);
    }

    private static void WritePath(Utf8JsonWriter writer, JsonElement spec, JsonElement item)
    {
        var source = spec.GetProperty("source").GetString()!;
        var result = Navigate(item, source);
        if (result.HasValue && result.Value.ValueKind == JsonValueKind.String)
        {
            writer.WriteStringValue(result.Value.GetString());
            return;
        }
        WriteDefault(writer, spec);
    }

    private static void WriteChain(Utf8JsonWriter writer, JsonElement spec, JsonElement item)
    {
        foreach (var src in spec.GetProperty("sources").EnumerateArray())
        {
            var path = src.GetString()!;
            var result = Navigate(item, path);
            if (result.HasValue && result.Value.ValueKind == JsonValueKind.String)
            {
                writer.WriteStringValue(result.Value.GetString());
                return;
            }
        }
        WriteDefault(writer, spec);
    }

    /// <summary>Returns the first 'items' sub-spec whose serialized result is a non-empty string.
    /// Used for FulltNavn-or-concat-parts and similar "try X, else build from parts" patterns.</summary>
    private void WriteCoalesce(Utf8JsonWriter writer, JsonElement spec, JsonElement root, JsonElement item)
    {
        foreach (var sub in spec.GetProperty("items").EnumerateArray())
        {
            using var buf = new MemoryStream();
            using (var subWriter = new Utf8JsonWriter(buf))
                WriteLeaf(subWriter, sub, root, item);
            using var doc = JsonDocument.Parse(buf.ToArray());
            var el = doc.RootElement;
            if (el.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(el.GetString()))
            {
                writer.WriteStringValue(el.GetString());
                return;
            }
        }
        WriteDefault(writer, spec);
    }

    private static void WriteSwitch(Utf8JsonWriter writer, JsonElement spec, JsonElement item)
    {
        var source = spec.GetProperty("source").GetString()!;
        var cases = spec.GetProperty("cases");
        var current = Navigate(item, source);
        if (current.HasValue && current.Value.ValueKind == JsonValueKind.String)
        {
            var key = current.Value.GetString()!;
            if (cases.TryGetProperty(key, out var caseValue))
            {
                caseValue.WriteTo(writer);
                return;
            }
        }
        WriteDefault(writer, spec);
    }

    private void WriteConcat(Utf8JsonWriter writer, JsonElement spec, JsonElement root, JsonElement item)
    {
        var separator = spec.TryGetProperty("separator", out var sepEl) ? sepEl.GetString() ?? " " : " ";
        var parts = new List<string>();
        foreach (var part in spec.GetProperty("parts").EnumerateArray())
        {
            string? value = null;
            if (part.ValueKind == JsonValueKind.String)
            {
                // Literal segment — string starting with '$' is treated as a path, otherwise a literal
                var raw = part.GetString()!;
                if (raw.StartsWith('$'))
                {
                    var resolved = Navigate(item, raw[1..]);
                    if (resolved.HasValue && resolved.Value.ValueKind == JsonValueKind.String)
                        value = resolved.Value.GetString();
                }
                else
                {
                    value = raw;
                }
            }
            else if (part.ValueKind == JsonValueKind.Object)
            {
                // Recursive: write the sub-spec to a buffer, then take the string value
                using var sub = new MemoryStream();
                using (var subWriter = new Utf8JsonWriter(sub))
                    WriteLeaf(subWriter, part, root, item);
                using var doc = JsonDocument.Parse(sub.ToArray());
                if (doc.RootElement.ValueKind == JsonValueKind.String)
                    value = doc.RootElement.GetString();
            }
            if (!string.IsNullOrEmpty(value))
                parts.Add(value);
        }
        if (parts.Count == 0)
        {
            WriteDefault(writer, spec);
            return;
        }
        writer.WriteStringValue(string.Join(separator, parts));
    }

    private static void WriteBoolean(Utf8JsonWriter writer, JsonElement spec, JsonElement item)
    {
        var source = spec.GetProperty("source").GetString()!;
        var result = Navigate(item, source);
        writer.WriteBooleanValue(result.HasValue && result.Value.ValueKind == JsonValueKind.True);
    }

    private static void WriteInt(Utf8JsonWriter writer, JsonElement spec, JsonElement item)
    {
        var source = spec.GetProperty("source").GetString()!;
        var result = Navigate(item, source);
        var fallback = spec.TryGetProperty("default", out var d) && d.ValueKind == JsonValueKind.Number
            ? d.GetInt32() : 0;
        if (!result.HasValue)
        {
            writer.WriteNumberValue(fallback);
            return;
        }
        var value = result.Value;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var n))
            writer.WriteNumberValue(n);
        else if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out var s))
            writer.WriteNumberValue(s);
        else
            writer.WriteNumberValue(fallback);
    }

    private void WriteRegistryField(Utf8JsonWriter writer, JsonElement spec, JsonElement item)
    {
        var registryFile = spec.GetProperty("registry").GetString()!;
        var registry = _registries.Load<LookupRegistry>(registryFile);
        var field = spec.GetProperty("field").GetString()!;
        var useDefault = spec.TryGetProperty("use_default", out var ud) && ud.ValueKind == JsonValueKind.True;

        // Try each key source
        Dictionary<string, JsonElement>? entry = null;
        if (spec.TryGetProperty("key_sources", out var keys))
        {
            foreach (var keySrc in keys.EnumerateArray())
            {
                var path = keySrc.GetString()!;
                var keyEl = Navigate(item, path);
                if (keyEl.HasValue && keyEl.Value.ValueKind == JsonValueKind.String)
                {
                    var key = keyEl.Value.GetString();
                    if (key != null && registry.Entries.TryGetValue(key, out var found))
                    {
                        entry = found;
                        break;
                    }
                }
            }
        }

        if (entry == null && useDefault)
            entry = registry.Default;

        if (entry != null && entry.TryGetValue(field, out var fieldValue) && fieldValue.ValueKind == JsonValueKind.String)
        {
            writer.WriteStringValue(fieldValue.GetString());
            return;
        }

        // Fallback chain: try alternate string paths in the source
        if (spec.TryGetProperty("fallback_sources", out var fallback))
        {
            foreach (var src in fallback.EnumerateArray())
            {
                var path = src.GetString()!;
                var result = Navigate(item, path);
                if (result.HasValue && result.Value.ValueKind == JsonValueKind.String)
                {
                    writer.WriteStringValue(result.Value.GetString());
                    return;
                }
            }
        }

        WriteDefault(writer, spec);
    }

    private void WriteRuleMatch(Utf8JsonWriter writer, JsonElement spec, JsonElement item)
    {
        var registryFile = spec.GetProperty("registry").GetString()!;
        var source = spec.TryGetProperty("source", out var s) ? s.GetString() : null;
        var registry = _registries.Load<RuleBasedRegistry>(registryFile);
        string? input = null;
        if (source != null)
        {
            var result = Navigate(item, source);
            if (result.HasValue && result.Value.ValueKind == JsonValueKind.String)
                input = result.Value.GetString();
        }
        writer.WriteStringValue(registry.Match(input));
    }

    private void WriteMapping(Utf8JsonWriter writer, JsonElement spec, JsonElement item)
    {
        var registryFile = spec.GetProperty("registry").GetString()!;
        var source = spec.GetProperty("source").GetString()!;
        var registry = _registries.Load<MappingRegistry>(registryFile);
        var result = Navigate(item, source);
        string? input = null;
        if (result.HasValue && result.Value.ValueKind == JsonValueKind.String)
            input = result.Value.GetString();
        writer.WriteStringValue(registry.Map(input));
    }

    // --- Array primitives -----------------------------------------------------

    /// <summary>Emits an object built from <c>fields</c> iff <c>source</c> path resolves; otherwise nothing.</summary>
    private void WriteObjectIfPresent(Utf8JsonWriter writer, JsonElement spec, JsonElement root, JsonElement item)
    {
        var source = spec.GetProperty("source").GetString()!;
        var resolved = Navigate(item, source);
        if (!resolved.HasValue || resolved.Value.ValueKind != JsonValueKind.Object)
        {
            writer.WriteNullValue();
            return;
        }
        WriteNode(writer, spec.GetProperty("fields"), root, resolved.Value);
    }

    /// <summary>
    /// Concatenates the results of multiple <c>parts</c> specs into a single array.
    /// Each part may be: object_if_present (single item or skipped), list_map (zero or more
    /// items), list_pluck (zero or more strings), list_const (registry list), or another array.
    /// </summary>
    private void WriteListConcat(Utf8JsonWriter writer, JsonElement spec, JsonElement root, JsonElement item)
    {
        writer.WriteStartArray();
        foreach (var part in spec.GetProperty("parts").EnumerateArray())
        {
            AppendListPart(writer, part, root, item);
        }
        writer.WriteEndArray();
    }

    private void AppendListPart(Utf8JsonWriter writer, JsonElement part, JsonElement root, JsonElement item)
    {
        if (part.ValueKind != JsonValueKind.Object || !part.TryGetProperty("kind", out var kindEl))
            throw new InvalidOperationException("list_concat parts must be specs with 'kind'.");

        var kind = kindEl.GetString();
        switch (kind)
        {
            case "object_if_present":
                AppendObjectIfPresent(writer, part, root, item);
                break;
            case "list_map":
                AppendListMap(writer, part, root, item);
                break;
            case "list_pluck":
                AppendListPluck(writer, part, item);
                break;
            case "list_const":
                AppendListConst(writer, part);
                break;
            default:
                throw new InvalidOperationException($"Unsupported list_concat part kind: '{kind}'.");
        }
    }

    private void AppendObjectIfPresent(Utf8JsonWriter writer, JsonElement spec, JsonElement root, JsonElement item)
    {
        var source = spec.GetProperty("source").GetString()!;
        var resolved = Navigate(item, source);
        if (!resolved.HasValue || resolved.Value.ValueKind != JsonValueKind.Object)
            return;

        // require_fields: skip the whole entry unless every named subfield resolves to a non-null string.
        // Used to suppress objects where the parent exists but all interesting fields are null
        // (e.g. an OrganisasjonsInformasjon block where Navn and Organisasjonsnummer are both null).
        if (spec.TryGetProperty("require_fields", out var req))
        {
            foreach (var field in req.EnumerateArray())
            {
                var sub = Navigate(resolved.Value, field.GetString()!);
                if (!sub.HasValue || sub.Value.ValueKind != JsonValueKind.String || string.IsNullOrEmpty(sub.Value.GetString()))
                    return;
            }
        }

        if (spec.TryGetProperty("exclude_when_id_matches", out var excl))
        {
            var idField = spec.GetProperty("id_field").GetString()!;
            var idValue = Navigate(resolved.Value, idField);
            if (idValue.HasValue && idValue.Value.ValueKind == JsonValueKind.String)
            {
                var id = idValue.Value.GetString();
                foreach (var otherPath in excl.EnumerateArray())
                {
                    var other = Navigate(root, otherPath.GetString()!);
                    if (other.HasValue && other.Value.ValueKind == JsonValueKind.String && other.Value.GetString() == id)
                        return;
                }
            }
        }

        WriteNode(writer, spec.GetProperty("fields"), root, resolved.Value);
    }

    private void AppendListMap(Utf8JsonWriter writer, JsonElement spec, JsonElement root, JsonElement item)
    {
        var source = spec.GetProperty("source").GetString()!;
        var array = Navigate(item, source);
        if (!array.HasValue || array.Value.ValueKind != JsonValueKind.Array)
            return;
        foreach (var element in array.Value.EnumerateArray())
            WriteNode(writer, spec.GetProperty("fields"), root, element);
    }

    private void AppendListPluck(Utf8JsonWriter writer, JsonElement spec, JsonElement item)
    {
        var source = spec.GetProperty("source").GetString()!;
        var array = Navigate(item, source);
        if (!array.HasValue || array.Value.ValueKind != JsonValueKind.Array)
            return;
        var fieldChain = spec.TryGetProperty("fields", out var fc) ? fc.EnumerateArray().Select(f => f.GetString()!).ToArray() : null;

        foreach (var element in array.Value.EnumerateArray())
        {
            string? value = null;
            if (fieldChain == null)
            {
                if (element.ValueKind == JsonValueKind.String)
                    value = element.GetString();
            }
            else
            {
                foreach (var field in fieldChain)
                {
                    var sub = Navigate(element, field);
                    if (sub.HasValue && sub.Value.ValueKind == JsonValueKind.String)
                    {
                        value = sub.Value.GetString();
                        break;
                    }
                }
            }
            if (value != null)
                writer.WriteStringValue(value);
        }
    }

    private void AppendListConst(Utf8JsonWriter writer, JsonElement spec)
    {
        var registryFile = spec.GetProperty("registry").GetString()!;
        var fieldName = spec.GetProperty("field").GetString()!;
        var registry = _registries.Load<MappingRegistry>(registryFile);
        if (string.Equals(fieldName, "references", StringComparison.Ordinal))
        {
            foreach (var s in registry.References)
                writer.WriteStringValue(s);
            return;
        }
        throw new InvalidOperationException($"list_const supports field 'references' only; got '{fieldName}'.");
    }

    // Standalone wrappers (used when the spec is directly a list_concat/list_map without nesting)
    private void WriteListMap(Utf8JsonWriter writer, JsonElement spec, JsonElement root, JsonElement item)
    {
        writer.WriteStartArray();
        AppendListMap(writer, spec, root, item);
        writer.WriteEndArray();
    }

    private void WriteListPluck(Utf8JsonWriter writer, JsonElement spec, JsonElement item)
    {
        writer.WriteStartArray();
        AppendListPluck(writer, spec, item);
        writer.WriteEndArray();
    }

    private void WriteListConst(Utf8JsonWriter writer, JsonElement spec)
    {
        writer.WriteStartArray();
        AppendListConst(writer, spec);
        writer.WriteEndArray();
    }

    // --- Helpers --------------------------------------------------------------

    private static void WriteDefault(Utf8JsonWriter writer, JsonElement spec)
    {
        if (spec.TryGetProperty("default", out var d))
            d.WriteTo(writer);
        else
            writer.WriteNullValue();
    }

    private static JsonElement? Navigate(JsonElement root, string path)
    {
        if (root.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            return null;

        var current = root;
        foreach (var segment in EnumerateSegments(path))
        {
            if (segment.IsArrayIndex)
            {
                if (current.ValueKind != JsonValueKind.Array || segment.Index >= current.GetArrayLength())
                    return null;
                current = current[segment.Index];
            }
            else
            {
                if (current.ValueKind != JsonValueKind.Object || !current.TryGetProperty(segment.Name, out var next))
                    return null;
                current = next;
            }
            if (current.ValueKind == JsonValueKind.Null)
                return null;
        }
        return current;
    }

    private readonly record struct PathSegment(string Name, int Index, bool IsArrayIndex);

    private static IEnumerable<PathSegment> EnumerateSegments(string path)
    {
        // Splits "Arrangement.ArrangementPeriode[0].StartDato" into name segments + array indices.
        foreach (var part in path.Split('.', StringSplitOptions.RemoveEmptyEntries))
        {
            var bracketStart = part.IndexOf('[');
            if (bracketStart < 0)
            {
                yield return new PathSegment(part, 0, false);
                continue;
            }

            var name = part[..bracketStart];
            if (name.Length > 0)
                yield return new PathSegment(name, 0, false);

            var remaining = part[bracketStart..];
            while (remaining.Length > 0 && remaining[0] == '[')
            {
                var end = remaining.IndexOf(']');
                if (end < 0)
                    throw new InvalidOperationException($"Malformed path segment '{part}' (missing ']').");
                var index = int.Parse(remaining[1..end]);
                yield return new PathSegment("", index, true);
                remaining = remaining[(end + 1)..];
            }
        }
    }
}
