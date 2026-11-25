using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.Models;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;

internal sealed class FailedRuleInfo
{
    public string RuleName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string? JavaScriptSource { get; set; }
}

internal sealed class DataProcessorGenerationResult
{
    public bool Success { get; set; }
    public string? GeneratedCode { get; set; }
    public string? ClassName { get; set; }
    public int TotalRules { get; set; }
    public int SuccessfulConversions { get; set; }
    public int FailedConversions { get; set; }
    public List<string> Errors { get; } = new();
    public List<FailedRuleInfo> FailedRules { get; } = new();
}

// Each rule becomes a method over the typed data model, translated independently, so an
// unsupported function cannot affect the other rules.
internal sealed class CSharpCodeGenerator(
    string layoutSetName,
    DataModelInfo? dataModelInfo,
    Dictionary<string, DataProcessingRule> rules,
    RuleHandlerParser jsParser,
    DataModelTypeResolver? typeResolver = null
)
{
    public DataProcessorGenerationResult Generate()
    {
        var result = new DataProcessorGenerationResult { TotalRules = rules.Count };
        if (dataModelInfo == null)
        {
            result.Errors.Add("Data model information not available. Cannot determine data type for layout set.");
            return result;
        }
        var className = ProcessorClassName(layoutSetName);
        result.ClassName = className;
        var model = dataModelInfo.ClassName ?? dataModelInfo.FullClassRef;
        var names = new HashSet<string>(StringComparer.Ordinal) { "Calculate", "Run", "ToNumber" };
        var methods = new List<RuleMethod>();
        var usesToNumber = false;
        foreach (var (id, rule) in rules)
        {
            var function = jsParser.GetDataProcessingFunction(rule.SelectedFunction ?? "");
            ConvertedRule? converted = null;
            string? reason = null;
            try
            {
                var inputs = (rule.InputParams ?? []).Where(pair => !string.IsNullOrEmpty(pair.Value)).ToArray();
                if (inputs.Length == 0)
                    throw new NotSupportedException("No mapped inputs; the legacy frontend did not execute this rule.");
                if (rule.OutParams?.GetValueOrDefault("outParam0") is not { Length: > 0 } outputPath)
                    throw new NotSupportedException("Expected one mapped output.");
                var output = Member(outputPath);
                if (output.Write is not { } write)
                    throw new NotSupportedException($"Output '{outputPath}' is inside a repeating group.");
                if (function?.FunctionAst is not { } ast)
                    throw new NotSupportedException("Handler function is missing or could not be parsed.");
                var converter = new PrimitiveRuleConverter(
                    inputs.ToDictionary(pair => pair.Key, pair => Member(pair.Value), StringComparer.Ordinal),
                    output.Type
                );
                var body = converter.Convert(ast);
                usesToNumber |= converter.UsesToNumber;
                // Name the method after the output property, or its parent for generic names such as value.
                var properties = outputPath.Split('.');
                var property =
                    properties.Length > 1 && properties[^1] is "value" or "Value" ? properties[^2] : properties[^1];
                converted = new(MethodName(property, names), outputPath, write, output.Type, body);
                result.SuccessfulConversions++;
            }
            catch (NotSupportedException error)
            {
                reason = error.Message;
                result.FailedConversions++;
                result.FailedRules.Add(
                    new()
                    {
                        RuleName = rule.SelectedFunction ?? id,
                        Reason = reason,
                        JavaScriptSource = function?.Implementation,
                    }
                );
            }
            methods.Add(new(id, rule, function?.Implementation, converted, reason));
        }
        var code = new IndentedStringBuilder();
        code.AppendLine("using System.Globalization;");
        code.AppendLine("using Altinn.Platform.Storage.Interface.Models;");
        if (!string.IsNullOrEmpty(dataModelInfo.Namespace))
            code.AppendLine($"using {dataModelInfo.Namespace};");
        code.AppendLine("using Altinn.App.Core.Models;");
        code.AppendLine("using Microsoft.Extensions.Logging;");
        code.AppendLine("#nullable enable");
        code.AppendLine("namespace Altinn.App.Logic.ConvertedLegacyRules;");
        // IDataProcessor runs before the app's own processors, which may use the calculated values.
        code.AppendLine($"public class {className}(ILogger<{className}> logger) : IDataProcessor, IDataWriteProcessor");
        code.OpenBrace();
        code.AppendLine(
            "public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object? previousData, string? language)"
        );
        code.OpenBrace();
        code.AppendLine($"if (data is {model} model)");
        code.AppendLine("    Calculate(model);");
        code.AppendLine("return Task.CompletedTask;");
        code.CloseBrace();
        code.AppendLine(
            "public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language) => Task.CompletedTask;"
        );
        // IDataProcessor handles updates. This hook covers form data created with the instance.
        code.AppendLine(
            "public Task ProcessDataWrite(IInstanceDataMutator instanceDataMutator, string taskId, DataElementChanges changes, string? language)"
        );
        code.OpenBrace();
        code.AppendLine("foreach (var change in changes.FormDataChanges)");
        code.AppendLine($"    if (change.Type == ChangeType.Created && change.CurrentFormData is {model} model)");
        code.AppendLine("        Calculate(model);");
        code.AppendLine("return Task.CompletedTask;");
        code.CloseBrace();
        AppendRules(code, model, methods, usesToNumber);
        code.CloseBrace();
        result.GeneratedCode = code.ToString();
        result.Success = true;
        return result;
    }

    // The rule methods, and Calculate, which runs them in the legacy order.
    internal static void AppendRules(
        IndentedStringBuilder code,
        string model,
        List<RuleMethod> methods,
        bool usesToNumber
    )
    {
        code.AppendLine("// Converted from legacy JavaScript calculation rules. Review the code and test the app.");
        code.AppendLine($"private void Calculate({model} model)");
        code.OpenBrace();
        foreach (var rule in methods.Select(method => method.Converted).OfType<ConvertedRule>())
            code.AppendLine(
                $"Run({PrimitiveRuleConverter.Quote(rule.Field)}, () => {rule.Write} = {rule.Name}(model));"
            );
        code.CloseBrace();
        code.AppendLine("// A legacy rule that failed wrote nothing, so a failing rule keeps the current value.");
        code.AppendLine("private void Run(string field, Action rule)");
        code.OpenBrace();
        code.AppendLine("try");
        code.AppendLine("{");
        code.AppendLine("    rule();");
        code.AppendLine("}");
        code.AppendLine("catch (Exception error)");
        code.AppendLine("{");
        code.AppendLine("    logger.LogWarning(error, \"Converted legacy rule for {Field} failed\", field);");
        code.AppendLine("}");
        code.CloseBrace();
        foreach (var method in methods)
        {
            code.AppendLine();
            var inputs = string.Join(
                ", ",
                (method.Rule.InputParams ?? [])
                    .Where(pair => !string.IsNullOrEmpty(pair.Value))
                    .Select(pair => $"{pair.Key} = {pair.Value}")
            );
            Comment(
                code,
                $"Rule {method.Id} ({method.Rule.SelectedFunction}): {inputs} -> {method.Rule.OutParams?.GetValueOrDefault("outParam0")}"
            );
            if (method.Function != null)
                Comment(code, method.Function);
            if (method.Converted is not { } rule)
            {
                Comment(code, $"TODO: Manual conversion required: {method.Reason}");
                continue;
            }
            code.AppendLine($"private static {rule.Type} {rule.Name}({model} model)");
            code.OpenBrace();
            foreach (var line in rule.Body.TrimEnd('\n').Split('\n'))
                code.AppendLine(line);
            code.CloseBrace();
        }
        if (usesToNumber)
        {
            code.AppendLine();
            foreach (var line in PrimitiveRuleConverter.ToNumberHelper.Split('\n'))
                code.AppendLine(line);
        }
    }

    private ModelMember Member(string path)
    {
        if (path.Contains('{'))
            throw new NotSupportedException($"Model path '{path}' requires a repeating-row context.");
        return typeResolver?.ResolveMember(path)
            ?? throw new NotSupportedException($"Model path '{path}' could not be resolved.");
    }

    private static string MethodName(string property, HashSet<string> names)
    {
        var name = new string(property.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());
        return PrimitiveRuleConverter.Unique(char.ToUpperInvariant(name[0]) + name[1..], names);
    }

    private static void Comment(IndentedStringBuilder code, string value)
    {
        foreach (var line in value.Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n'))
            code.AppendLine("// " + line);
    }

    internal static string ProcessorClassName(string name) => ClassName(name) + "DataProcessor";

    private static string ClassName(string name)
    {
        var identifier = new string(name.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());
        if (identifier.Length > 0 && char.IsDigit(identifier[0]))
            identifier = "Layout" + identifier;
        return identifier.Length == 0 ? "Legacy" : char.ToUpperInvariant(identifier[0]) + identifier[1..];
    }
}

internal sealed record RuleMethod(
    string Id,
    DataProcessingRule Rule,
    string? Function,
    ConvertedRule? Converted,
    string? Reason
);

internal sealed record ConvertedRule(string Name, string Field, string Write, string Type, string Body);
