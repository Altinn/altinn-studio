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

// Keep JS values until the final model assignment. Each rule is translated independently,
// so an unsupported function cannot force other rules onto a less faithful translation.
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
        var className = ClassName(layoutSetName) + "DataProcessor";
        result.ClassName = className;
        var methods =
            new List<(
                string Id,
                DataProcessingRule Rule,
                JavaScriptFunction? Function,
                string? Body,
                string? Reason
            )>();
        foreach (var (id, rule) in rules)
        {
            var function = jsParser.GetDataProcessingFunction(rule.SelectedFunction ?? "");
            string? body = null;
            string? reason = null;
            try
            {
                if (rule.InputParams == null || !rule.InputParams.Values.Any(path => !string.IsNullOrEmpty(path)))
                    throw new NotSupportedException("No mapped inputs; the legacy frontend did not execute this rule.");
                if (
                    rule.OutParams is not { Count: 1 }
                    || string.IsNullOrWhiteSpace(rule.OutParams.GetValueOrDefault("outParam0"))
                )
                    throw new NotSupportedException("Expected one mapped output.");
                foreach (
                    var path in rule
                        .InputParams.Values.Where(path => !string.IsNullOrEmpty(path))
                        .Concat(rule.OutParams.Values)
                )
                {
                    if (string.IsNullOrWhiteSpace(path) || path.Contains('{') || path.Contains('}'))
                        throw new NotSupportedException($"Model path '{path}' requires a repeating-row context.");
                    if (typeResolver != null && typeResolver.ResolveType(path) == null)
                        throw new NotSupportedException($"Model path '{path}' could not be resolved.");
                }
                if (function?.FunctionAst is not { } ast)
                    throw new NotSupportedException("Handler function is missing or could not be parsed.");
                body = new PrimitiveRuleConverter(function.ParameterName).Convert(ast);
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
            methods.Add((id, rule, function, body, reason));
        }
        var code = new IndentedStringBuilder();
        code.AppendLine("using Altinn.App.Core.Models;");
        code.AppendLine("using Altinn.App.Core.Internal.Data;");
        code.AppendLine("using Altinn.App.Core.Internal.Expressions;");
        code.AppendLine("#nullable enable");
        code.AppendLine("namespace Altinn.App.Logic.ConvertedLegacyRules;");
        code.AppendLine($"public class {className} : IDataWriteProcessor");
        code.OpenBrace();
        code.AppendLine(
            "public async Task ProcessDataWrite(IInstanceDataMutator instanceDataMutator, string taskId, DataElementChanges changes, string? language)"
        );
        code.OpenBrace();
        code.AppendLine("// Generated from legacy JavaScript. Review the retained source and test the upgraded app.");
        // A write can contain changes to more than one instance of the same model.
        code.AppendLine(
            $"foreach (var change in changes.FormDataChanges.Where(c => c.CurrentFormData is global::{dataModelInfo.FullClassRef}))"
        );
        code.OpenBrace();
        // The legacy frontend collected every rule result before applying any model writes.
        if (result.SuccessfulConversions > 0)
            code.AppendLine("var inputs = change.CurrentFormDataWrapper.Copy();");
        for (var index = 0; index < methods.Count; index++)
            if (methods[index].Body != null)
                code.AppendLine($"await Rule_{index}(change.CurrentFormDataWrapper, inputs);");
        code.CloseBrace();
        // Keep this method valid when all rules require manual work, without throwing on every save.
        code.AppendLine("await Task.CompletedTask;");
        code.CloseBrace();
        for (var index = 0; index < methods.Count; index++)
        {
            var method = methods[index];
            Comment(code, $"Rule {method.Id}, function {method.Rule.SelectedFunction}");
            foreach (var (name, path) in method.Rule.InputParams ?? [])
                Comment(code, $"Input {name} = {path}");
            foreach (var (name, path) in method.Rule.OutParams ?? [])
                Comment(code, $"Output {name} = {path}");
            if (method.Function != null)
                Comment(code, method.Function.Implementation);
            if (method.Body == null)
            {
                Comment(code, $"TODO: Manual conversion required: {method.Reason}");
                continue;
            }
            code.AppendLine($"private Task Rule_{index}(IFormDataWrapper wrapper, IFormDataWrapper inputs)");
            code.OpenBrace();
            code.AppendLine("var obj = new Dictionary<string, object?>");
            code.OpenBrace();
            foreach (var (name, path) in method.Rule.InputParams ?? [])
                if (!string.IsNullOrEmpty(path))
                    code.AppendLine(
                        $"[{PrimitiveRuleConverter.Quote(name)}] = JsInput(inputs.Get({PrimitiveRuleConverter.Quote(path)})),"
                    );
            code.CloseBrace();
            code.AppendLine(";");
            code.AppendLine($"var result = Calculate_{index}(obj);");
            code.AppendLine("// JSON serialization sent non-finite JS numbers as null.");
            code.AppendLine("if (result is double number && !double.IsFinite(number)) result = null;");
            code.AppendLine(
                $"wrapper.Set({PrimitiveRuleConverter.Quote((method.Rule.OutParams ?? throw new InvalidOperationException())["outParam0"])}, ExpressionValue.FromObject(result is JsUndefined ? null : result));"
            );
            code.AppendLine("return Task.CompletedTask;");
            code.CloseBrace();
            code.AppendLine($"private static object? Calculate_{index}(Dictionary<string, object?> obj)");
            code.OpenBrace();
            foreach (var line in method.Body.Split('\n'))
                code.AppendLine(line);
            code.CloseBrace();
        }
        if (result.SuccessfulConversions > 0)
            foreach (var line in PrimitiveRuleConverter.Runtime.Split('\n'))
                code.AppendLine(line);
        code.CloseBrace();
        result.GeneratedCode = code.ToString();
        result.Success = true;
        return result;
    }

    private static void Comment(IndentedStringBuilder code, string value)
    {
        foreach (var line in value.Replace("\r", "", StringComparison.Ordinal).Split('\n'))
            code.AppendLine("// " + line);
    }

    private static string ClassName(string name)
    {
        var identifier = new string(name.Where(c => char.IsAsciiLetterOrDigit(c) || c == '_').ToArray());
        if (identifier.Length > 0 && char.IsAsciiDigit(identifier[0]))
            identifier = "Layout" + identifier;
        return identifier.Length == 0 ? "Legacy" : char.ToUpperInvariant(identifier[0]) + identifier[1..];
    }
}
