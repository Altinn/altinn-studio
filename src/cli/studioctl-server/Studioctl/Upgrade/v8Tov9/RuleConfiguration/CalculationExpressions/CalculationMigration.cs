using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.Models;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;

internal sealed record CalculationMigrationResult(
    IReadOnlyDictionary<string, IReadOnlySet<string>> ConvertedRules,
    IReadOnlyList<string> FallbackReasons,
    IReadOnlyDictionary<string, IReadOnlySet<string>> ManualRules
);

internal static partial class CalculationMigration
{
    private sealed class Candidate(string layout, string id, string model, DataProcessingRule rule)
    {
        public string Layout { get; } = layout;
        public string Id { get; } = id;
        public string Model { get; } = model;
        public DataProcessingRule Rule { get; } = rule;
        public DataProcessingRule Paths { get; set; } = rule;
        public Candidate? RepeatingGroup { get; set; }
        public string? Target { get; set; }
        public JsonNode? Expression { get; set; }
        public string? Reason { get; set; }
        public bool Manual { get; set; }
        public bool NeedsNullableSchema { get; set; }
        public List<Candidate> Connected { get; } = [];
    }

    // Plan all layout sets together: the calculation file belongs to the data model, and two
    // processors must not independently own the same field or a connected chain of fields.
    public static CalculationMigrationResult Migrate(string projectFolder)
    {
        var uiPath = Path.Combine(projectFolder, "App", "ui");
        if (!Directory.Exists(uiPath))
            return new(
                new Dictionary<string, IReadOnlySet<string>>(),
                [],
                new Dictionary<string, IReadOnlySet<string>>()
            );
        var modelResolver = new DataModelResolver(projectFolder);
        modelResolver.LoadConfiguration();
        var candidates = new List<Candidate>();
        foreach (var directory in Directory.GetDirectories(uiPath).Order(StringComparer.Ordinal))
        {
            var configPath = Path.Combine(directory, "RuleConfiguration.json");
            if (!File.Exists(configPath))
                continue;
            var config = new RuleConfigurationParser(configPath);
            config.Parse();
            var rules = config.GetDataProcessingRules();
            if (rules.Count == 0)
                continue;
            var layout = Path.GetFileName(directory);
            var model = modelResolver.GetDataModelInfo(layout);
            if (model == null)
                continue; // Existing C# migration reports unresolved models and retains the legacy files.
            var types = new DataModelTypeResolver(projectFolder);
            var loaded = types.LoadDataModelType(model);
            var numericOptionInputs = NumericOptionInputs.Load(projectFolder, directory, model.DataType);
            var selectionOptions = CalculationInputOptions.Load(projectFolder, directory, model.DataType);
            var handlerPath = Path.Combine(directory, "RuleHandler.js");
            var handler = new RuleHandlerParser(handlerPath);
            if (File.Exists(handlerPath))
                handler.Parse();
            foreach (var (id, rule) in rules)
            {
                var candidate = new Candidate(layout, id, model.DataType, rule);
                candidates.Add(candidate);
                try
                {
                    if (
                        string.IsNullOrWhiteSpace(model.DataType)
                        || model.DataType.Contains('/')
                        || model.DataType.Contains('\\')
                    )
                        throw new NotSupportedException("Data type is not a model file name.");
                    if (
                        rule.OutParams?.Count != 1
                        || !rule.OutParams.TryGetValue("outParam0", out var target)
                        || string.IsNullOrWhiteSpace(target)
                    )
                        throw new NotSupportedException("Expected one mapped output.");
                    if (Placeholder().Matches(target).Any(match => match.Index + match.Length == target.Length))
                        throw new NotSupportedException("Repeating scalar collection outputs require C# conversion.");
                    candidate.Target = NormalizePath(target);
                    var outputType = types.ResolveType(candidate.Target);
                    if (!loaded || outputType == null)
                        throw new NotSupportedException("Output model type could not be resolved.");
                    var normalized = new DataProcessingRule
                    {
                        SelectedFunction = rule.SelectedFunction,
                        OutParams = new() { ["outParam0"] = candidate.Target },
                        InputParams = new(),
                    };
                    foreach (var (name, input) in rule.InputParams ?? [])
                    {
                        if (string.IsNullOrEmpty(input))
                            continue;
                        if (!SameRowScope(input, target))
                            throw new NotSupportedException(
                                "Input and output use different repeating row placeholders."
                            );
                        normalized.InputParams[name] = NormalizePath(input);
                    }
                    candidate.Paths = normalized;
                    if (normalized.InputParams.Count == 0)
                        throw new NotSupportedException(
                            "No mapped inputs; the legacy frontend did not execute this rule."
                        );
                    var function =
                        rule.SelectedFunction == null ? null : handler.GetDataProcessingFunction(rule.SelectedFunction);
                    if (function == null)
                        throw new NotSupportedException("JavaScript calculation function could not be resolved.");
                    var converter = new CalculationExpressionConverter();
                    candidate.Expression = converter.Convert(
                        function,
                        normalized,
                        types,
                        model.DataType,
                        numericOptionInputs,
                        selectionOptions
                    );
                    candidate.NeedsNullableSchema =
                        converter.MayReturnNull
                        && outputType is "int?" or "long?" or "decimal?" or "double?" or "float?" or "bool?";
                    if (
                        (candidate.Expression?.ToJsonString(new JsonSerializerOptions { MaxDepth = 56 }).Length ?? 0)
                        > 65536
                    )
                        throw new NotSupportedException("Calculation expression exceeds the size limit.");
                }
                catch (NotSupportedException ex)
                {
                    candidate.Reason = ex.Message;
                }
                catch (JsonException)
                {
                    candidate.Reason = "Calculation expression exceeds the configuration depth limit.";
                }
            }
        }

        foreach (var group in candidates.GroupBy(c => c.Model, StringComparer.Ordinal))
        {
            var rules = group.ToArray();
            DeduplicateRepeatingRules(rules);
            var schema = CalculationSchema.Load(projectFolder, group.Key);
            foreach (var rule in rules)
                if (rule.NeedsNullableSchema && rule.Target is { } target && !schema.CanAllowNull(target))
                    rule.Reason =
                        $"Nullable calculation output could not be resolved in the model schema '{Path.GetRelativePath(projectFolder, schema.FilePath)}'.";
            for (var i = 0; i < rules.Length; i++)
            {
                var current = rules[i];
                var output = current.Target ?? Output(current.Rule);
                if (output == null)
                {
                    // Unknown writes could overlap any other calculation in this model.
                    foreach (var other in rules)
                        Connect(current, other);
                    continue;
                }
                if (Inputs(current.Paths).Any(input => Overlaps(input, output)))
                    current.Reason = "Calculation reads its own output.";
                for (var j = i + 1; j < rules.Length; j++)
                {
                    var other = rules[j];
                    var otherOutput = other.Target ?? Output(other.Rule);
                    if (otherOutput == null)
                        continue;
                    if (current.RepeatingGroup != null && current.RepeatingGroup == other.RepeatingGroup)
                    {
                        Connect(current, other);
                        continue;
                    }
                    var duplicate = Overlaps(output, otherOutput);
                    var dependency = Inputs(other.Paths).Any(input => Overlaps(input, output));
                    var backwards = Inputs(current.Paths).Any(input => Overlaps(input, otherOutput));
                    if (!duplicate && !dependency && !backwards)
                        continue;
                    Connect(current, other);
                    if (duplicate || dependency || backwards || current.Layout != other.Layout)
                        current.Reason = duplicate
                            ? "Multiple calculations write overlapping outputs."
                            : "Connected calculations require the legacy input snapshot before any rule writes.";
                }
            }

            var filePath = Path.Combine(projectFolder, "App", "models", group.Key + ".calculation.json");
            var originalContent = File.Exists(filePath) ? File.ReadAllText(filePath) : null;
            JsonObject document;
            try
            {
                if (originalContent != null)
                    originalContent = CanonicalizeKeys(originalContent);
                document =
                    originalContent != null
                        ? JsonNode.Parse(
                            originalContent,
                            documentOptions: new()
                            {
                                CommentHandling = JsonCommentHandling.Skip,
                                AllowTrailingCommas = true,
                                AllowDuplicateProperties = false,
                            }
                        ) as JsonObject
                            ?? throw new JsonException("Expected a calculation object.")
                        : new JsonObject { ["calculations"] = new JsonArray() };
                if (
                    Property(document, "calculations") is not JsonArray items
                    || items.Any(item =>
                        item is not JsonObject definition
                        || string.IsNullOrWhiteSpace(Field(definition))
                        || PropertyName(definition, "expression") == null
                    )
                )
                    throw new JsonException("Expected a list of field and expression items.");
            }
            catch (JsonException)
            {
                foreach (var rule in rules)
                {
                    rule.Reason = "Existing calculation configuration could not be read safely.";
                    rule.Manual = true;
                }
                continue;
            }
            var calculations = Property(document, "calculations") as JsonArray ?? throw new InvalidOperationException();
            var alreadyConverted = rules
                .Where(rule =>
                    rule.Reason == null
                    && rule.Target != null
                    && calculations.Count(item => Field(item) == rule.Target) == 1
                    && calculations.Any(item =>
                        Field(item) == rule.Target
                        && item is JsonObject definition
                        && JsonNode.DeepEquals(Property(definition, "expression"), rule.Expression)
                    )
                )
                .Select(rule => rule.Target)
                .ToHashSet(StringComparer.Ordinal);
            foreach (var rule in rules)
            {
                if (rule.Target == null)
                    continue;
                var processorPath = Path.Combine(
                    projectFolder,
                    "App",
                    "logic",
                    "ConvertedLegacyRules",
                    CSharpCodeGenerator.ProcessorClassName(rule.Layout) + ".cs"
                );
                if (File.Exists(processorPath))
                {
                    if (!alreadyConverted.Contains(rule.Target))
                        rule.Reason = "An existing generated C# processor already owns this layout set.";
                    else if (ProcessorMayWrite(processorPath, rule.Target))
                    {
                        rule.Reason = "An existing C# processor also writes this expression calculation's output.";
                        rule.Manual = true;
                    }
                }
                foreach (var definition in calculations)
                {
                    var target = Field(definition) ?? throw new InvalidOperationException();
                    if (alreadyConverted.Contains(target))
                        continue; // A resumed upgrade may already have written this exact calculation.
                    if (
                        Overlaps(target, rule.Target)
                        || Inputs(rule.Paths).Any(input => Overlaps(input, target))
                        || References(definition).Any(input => Overlaps(input, rule.Target))
                    )
                    {
                        rule.Reason = "Calculation overlaps an existing expression calculation or its dependencies.";
                        rule.Manual = true;
                    }
                }
            }
            var rejected = new Queue<Candidate>(rules.Where(rule => rule.Reason != null));
            while (rejected.TryDequeue(out var rule))
                foreach (var connected in rule.Connected)
                    if (connected.Reason == null)
                    {
                        connected.Reason = "A connected calculation requires C# fallback.";
                        connected.Manual = rule.Manual;
                        rejected.Enqueue(connected);
                    }
            // A matching expression can cease to be eligible when a connected rule falls back.
            // Do not give its output back to C# while the existing expression still owns it.
            foreach (var rule in rules)
            {
                if (rule.Reason == null || rule.Target is not { } target)
                    continue;
                if (
                    calculations.Any(calculation =>
                        Overlaps(Field(calculation) ?? throw new InvalidOperationException(), target)
                        || Inputs(rule.Paths)
                            .Any(input => Overlaps(input, Field(calculation) ?? throw new InvalidOperationException()))
                        || References(calculation).Any(input => Overlaps(input, target))
                    )
                )
                    rule.Manual = true;
            }
            var manual = new Queue<Candidate>(rules.Where(rule => rule.Manual));
            while (manual.TryDequeue(out var rule))
                foreach (var connected in rule.Connected)
                    if (!connected.Manual)
                    {
                        connected.Manual = true;
                        manual.Enqueue(connected);
                    }
            var accepted = rules.Where(rule => rule.Reason == null).ToArray();
            if (accepted.Length == 0)
                continue;
            var schemaContent = schema.AllowNull(
                accepted
                    .Where(rule => rule.NeedsNullableSchema)
                    .Select(rule => rule.Target ?? throw new InvalidOperationException())
            );
            if (schemaContent != null)
                WriteCalculationFile(schema.FilePath, schemaContent);
            var targets = calculations.Select(Field).ToHashSet(StringComparer.Ordinal);
            var appended = new List<JsonObject>();
            foreach (var rule in accepted)
                if (rule.Target is { } target && targets.Add(target))
                {
                    var definition = Definition(target, rule.Expression);
                    calculations.Add(definition);
                    appended.Add(definition);
                }
            Directory.CreateDirectory(Path.GetDirectoryName(filePath) ?? throw new InvalidOperationException());
            var content =
                originalContent == null
                    ? document.ToJsonString(new JsonSerializerOptions { WriteIndented = true }) + "\n"
                    : AppendDefinitions(originalContent, appended);
            // Don't rewrite an existing file on resumed upgrades unless it actually gained entries.
            if (
                !File.Exists(filePath)
                || !JsonNode.DeepEquals(
                    JsonNode.Parse(
                        File.ReadAllText(filePath),
                        documentOptions: new()
                        {
                            CommentHandling = JsonCommentHandling.Skip,
                            AllowTrailingCommas = true,
                        }
                    ),
                    document
                )
            )
                WriteCalculationFile(filePath, content);
        }
        var converted = candidates
            .Where(c => c.Reason == null)
            .GroupBy(c => c.Layout, StringComparer.Ordinal)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlySet<string>)g.Select(c => c.Id).ToHashSet(StringComparer.Ordinal),
                StringComparer.Ordinal
            );
        var reasons = candidates
            .Where(c => c.Reason != null)
            .Select(c => $"Layout set '{c.Layout}', calculation '{c.Rule.SelectedFunction}' ({c.Id}): {c.Reason}")
            .ToArray();
        var manualRules = candidates
            .Where(c => c.Manual)
            .GroupBy(c => c.Layout, StringComparer.Ordinal)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlySet<string>)g.Select(c => c.Id).ToHashSet(StringComparer.Ordinal),
                StringComparer.Ordinal
            );
        return new(converted, reasons, manualRules);
    }

    // Older apps often copied the same calculation for each fixed table row. Emit one
    // repeating calculation when the expressions differ only by their own row indices.
    private static void DeduplicateRepeatingRules(IEnumerable<Candidate> candidates)
    {
        var groups = candidates
            .Where(candidate =>
                candidate.Reason == null && candidate.Target is { } target && FixedIndex().IsMatch(target)
            )
            .GroupBy(candidate => (candidate.Layout, Target: FixedIndex().Replace(candidate.Target ?? "", "[]")));
        foreach (var group in groups)
        {
            var rows = group.ToArray();
            if (
                rows.Length < 2
                || rows.Select(row => row.Target).Distinct(StringComparer.Ordinal).Count() != rows.Length
            )
                continue;
            var indices = rows.Select(row => FixedIndex().Matches(row.Target ?? "").ToArray()).ToArray();
            var varyingIndices = Enumerable
                .Range(0, indices[0].Length)
                .Where(index =>
                    indices.Select(matches => matches[index].Value).Distinct(StringComparer.Ordinal).Count() > 1
                )
                .ToHashSet();
            // Keep deliberate gaps and diagonal selections fixed. A full rectangular set of
            // equivalent rows is the legacy workaround that can become a repeating calculation.
            var dimensions = varyingIndices
                .Select(index =>
                    indices
                        .Select(matches => int.TryParse(matches[index].Value[1..^1], out var value) ? value : -1)
                        .Distinct()
                        .Order()
                        .ToArray()
                )
                .ToArray();
            if (
                dimensions.Any(values => !values.SequenceEqual(Enumerable.Range(0, values.Length)))
                || dimensions.Aggregate(1L, (count, values) => count > rows.Length ? count : count * values.Length)
                    != rows.Length
            )
                continue;
            var expressions = rows.Select(row => RebaseReferences(row.Expression, row.Target ?? "", varyingIndices))
                .ToArray();
            if (expressions.Skip(1).Any(expression => !JsonNode.DeepEquals(expression, expressions[0])))
                continue;
            for (var index = 0; index < rows.Length; index++)
            {
                var row = rows[index];
                var originalTarget = row.Target ?? throw new InvalidOperationException();
                row.Paths.InputParams = row.Paths.InputParams?.ToDictionary(
                    input => input.Key,
                    input => RowRelativePath(input.Value, originalTarget, varyingIndices),
                    StringComparer.Ordinal
                );
                row.Target = RowRelativePath(originalTarget, originalTarget, varyingIndices);
                row.Expression = expressions[index];
                row.RepeatingGroup = rows[0];
            }
        }
    }

    private static JsonNode? RebaseReferences(JsonNode? expression, string target, IReadOnlySet<int> varyingIndices)
    {
        if (expression is not JsonArray call)
            return expression?.DeepClone();
        var result = new JsonArray(
            call.Select(argument => RebaseReferences(argument, target, varyingIndices)).ToArray()
        );
        if (
            result.Count > 1
            && result[0]?.GetValueKind() == JsonValueKind.String
            && result[0]?.GetValue<string>() == "dataModel"
            && result[1]?.GetValueKind() == JsonValueKind.String
            && result[1]?.GetValue<string>() is { } path
        )
            result[1] = RowRelativePath(path, target, varyingIndices);
        return result;
    }

    private static string RowRelativePath(string path, string target, IReadOnlySet<int> varyingIndices)
    {
        var indices = FixedIndex().Matches(target).ToArray();
        for (var index = indices.Length - 1; index >= 0; index--)
        {
            var match = indices[index];
            if (
                varyingIndices.Contains(index)
                && path.StartsWith(target[..(match.Index + match.Length)] + ".", StringComparison.Ordinal)
            )
                path = path.Remove(match.Index, match.Length);
        }
        return path;
    }

    private static void WriteCalculationFile(string path, string content)
    {
        var temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            File.WriteAllText(temporary, content);
            File.Move(temporary, path, overwrite: true);
        }
        finally
        {
            if (File.Exists(temporary))
                File.Delete(temporary);
        }
    }

    private static bool ProcessorMayWrite(string path, string target)
    {
        var syntax = CSharpSyntaxTree.ParseText(File.ReadAllText(path)).GetRoot();
        if (syntax.ContainsDiagnostics)
            return true;
        foreach (var invocation in syntax.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (invocation.Expression is not MemberAccessExpressionSyntax { Name.Identifier.ValueText: "Set" })
                continue;
            if (
                invocation.ArgumentList.Arguments.FirstOrDefault()?.Expression
                    is not LiteralExpressionSyntax { Token.Value: string output }
                || Overlaps(output, target)
            )
                return true;
        }
        return false;
    }

    private static string? Field(JsonNode? definition) =>
        definition is JsonObject item
        && Property(item, "field") is JsonValue field
        && field.TryGetValue<string>(out var name)
            ? name
            : null;

    private static string? PropertyName(JsonObject value, string name)
    {
        var matches = value
            .Select(item => item.Key)
            .Where(key => key.Equals(name, StringComparison.OrdinalIgnoreCase))
            .ToArray();
        if (matches.Length > 1)
            throw new JsonException($"Ambiguous calculation property '{name}'.");
        return matches.SingleOrDefault();
    }

    private static JsonNode? Property(JsonObject value, string name) =>
        PropertyName(value, name) is { } key ? value[key] : null;

    private static string CanonicalizeKeys(string source)
    {
        var bytes = Encoding.UTF8.GetBytes(source);
        var reader = new Utf8JsonReader(
            bytes,
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
        );
        var replacements = new List<(int Start, int Length, string Name)>();
        var inCalculations = false;
        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndArray && reader.CurrentDepth == 1)
                inCalculations = false;
            if (reader.TokenType != JsonTokenType.PropertyName)
                continue;
            var name = reader.GetString() ?? "";
            string? canonical = null;
            if (reader.CurrentDepth == 1 && name.Equals("calculations", StringComparison.OrdinalIgnoreCase))
            {
                canonical = "calculations";
                inCalculations = true;
            }
            else if (inCalculations && reader.CurrentDepth == 3)
                canonical = name.ToLowerInvariant() switch
                {
                    "field" => "field",
                    "expression" => "expression",
                    _ => null,
                };
            if (canonical != null && name != canonical)
                replacements.Add((checked((int)reader.TokenStartIndex), reader.ValueSpan.Length + 2, canonical));
        }
        // Replace only key tokens; comments, Unicode text and expression literals stay intact.
        foreach (var (start, length, name) in replacements.AsEnumerable().Reverse())
        {
            var offset = Encoding.UTF8.GetCharCount(bytes.AsSpan(0, start));
            var count = Encoding.UTF8.GetCharCount(bytes.AsSpan(start, length));
            source = source.Remove(offset, count).Insert(offset, JsonSerializer.Serialize(name));
        }
        return source;
    }

    private static string AppendDefinitions(string source, IReadOnlyList<JsonObject> definitions)
    {
        if (definitions.Count == 0)
            return source;
        var bytes = Encoding.UTF8.GetBytes(source);
        var reader = new Utf8JsonReader(
            bytes,
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
        );
        reader.Read();
        while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
        {
            var name = reader.GetString();
            reader.Read();
            if (!string.Equals(name, "calculations", StringComparison.OrdinalIgnoreCase))
            {
                reader.Skip();
                continue;
            }
            var lastValueEnd = reader.BytesConsumed;
            var hasItems = false;
            while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
            {
                reader.Skip();
                lastValueEnd = reader.BytesConsumed;
                hasItems = true;
            }
            var close = Encoding.UTF8.GetCharCount(bytes.AsSpan(0, checked((int)reader.TokenStartIndex)));
            var last = Encoding.UTF8.GetCharCount(bytes.AsSpan(0, checked((int)lastValueEnd)));
            // The tail contains only whitespace, comments and an optional trailing comma.
            var tail = Regex.Replace(source[last..close], @"//[^\r\n]*|/\*.*?\*/", "", RegexOptions.Singleline);
            if (hasItems && !tail.Contains(','))
            {
                source = source.Insert(last, ",");
                close++;
            }
            var entries = definitions.Select(definition =>
                definition
                    .ToJsonString(new JsonSerializerOptions { WriteIndented = true })
                    .Replace("\n", "\n    ", StringComparison.Ordinal)
            );
            return source.Insert(close, "\n    " + string.Join(",\n    ", entries) + "\n  ");
        }
        throw new JsonException("Could not locate the calculation list.");
    }

    private static JsonObject Definition(string field, JsonNode? expression) =>
        new() { ["field"] = field, ["expression"] = expression?.DeepClone() };

    private static string? Output(DataProcessingRule rule) =>
        rule.OutParams?.Count == 1 ? rule.OutParams.GetValueOrDefault("outParam0") : null;

    private static IEnumerable<string> Inputs(DataProcessingRule rule) =>
        (rule.InputParams?.Values.AsEnumerable() ?? []).Where(input => !string.IsNullOrEmpty(input));

    private static void Connect(Candidate left, Candidate right)
    {
        if (left == right)
            return;
        left.Connected.Add(right);
        right.Connected.Add(left);
    }

    private static string NormalizePath(string path)
    {
        var result = Placeholder().Replace(path, "");
        if (
            result.Contains('{')
            || result.Contains('}')
            || FixedIndex().Replace(result, "").Contains('[')
            || FixedIndex().Replace(result, "").Contains(']')
        )
            throw new NotSupportedException("Unsupported repeating row placeholders.");
        return result;
    }

    private static bool SameRowScope(string input, string output)
    {
        var inputs = Placeholder().Matches(input).Select(match => input[..match.Index] + match.Value).ToArray();
        var outputs = Placeholder().Matches(output).Select(match => output[..match.Index] + match.Value).ToArray();
        return inputs.SequenceEqual(outputs.Take(inputs.Length));
    }

    private static bool Overlaps(string left, string right)
    {
        var leftParts = left.Split('.');
        var rightParts = right.Split('.');
        for (var index = 0; index < Math.Min(leftParts.Length, rightParts.Length); index++)
        {
            var first = PathSegment().Match(leftParts[index]);
            var second = PathSegment().Match(rightParts[index]);
            if (!first.Success || !second.Success)
                return true;
            if (first.Groups[1].Value != second.Groups[1].Value)
                return false;
            if (
                int.TryParse(first.Groups[2].Value, out var firstIndex)
                && int.TryParse(second.Groups[2].Value, out var secondIndex)
                && firstIndex != secondIndex
            )
                return false;
        }
        return true;
    }

    private static IEnumerable<string> References(JsonNode? node)
    {
        if (node is JsonArray array)
        {
            if (
                array.Count > 1
                && array[0]?.GetValueKind() == JsonValueKind.String
                && array[0]?.GetValue<string>() == "dataModel"
                && array[1]?.GetValueKind() == JsonValueKind.String
                && array[1]?.GetValue<string>() is { } path
            )
                yield return path;
            foreach (var child in array)
            {
                foreach (var reference in References(child))
                    yield return reference;
            }
        }
        if (node is JsonObject obj)
        {
            foreach (var child in obj.Select(property => property.Value))
            {
                foreach (var reference in References(child))
                    yield return reference;
            }
        }
    }

    [GeneratedRegex(@"\[\{[01]\}\]")]
    private static partial Regex Placeholder();

    [GeneratedRegex(@"\[\d+\]")]
    private static partial Regex FixedIndex();

    [GeneratedRegex(@"^([^\[\]]+)(?:\[([^\]]*)\])?$")]
    private static partial Regex PathSegment();
}
