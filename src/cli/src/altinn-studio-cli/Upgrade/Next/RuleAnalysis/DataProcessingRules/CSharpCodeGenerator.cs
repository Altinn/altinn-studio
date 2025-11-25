using System.Text;
using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Models;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.DataProcessingRules;

/// <summary>
/// Information about a failed rule conversion
/// </summary>
internal class FailedRuleInfo
{
    public string RuleName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string? JavaScriptSource { get; set; }
}

/// <summary>
/// Result of generating a data processor class
/// </summary>
internal class DataProcessorGenerationResult
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

/// <summary>
/// Generates C# IDataWriteProcessor implementations from JavaScript data processing rules
/// </summary>
internal class CSharpCodeGenerator
{
    private readonly string _layoutSetName;
    private readonly DataModelInfo? _dataModelInfo;
    private readonly Dictionary<string, DataProcessingRule> _rules;
    private readonly RuleHandlerParser _jsParser;

    public CSharpCodeGenerator(
        string layoutSetName,
        DataModelInfo? dataModelInfo,
        Dictionary<string, DataProcessingRule> rules,
        RuleHandlerParser jsParser
    )
    {
        _layoutSetName = layoutSetName;
        _dataModelInfo = dataModelInfo;
        _rules = rules;
        _jsParser = jsParser;
    }

    /// <summary>
    /// Generate the complete IDataWriteProcessor class
    /// </summary>
    public DataProcessorGenerationResult Generate()
    {
        var result = new DataProcessorGenerationResult { TotalRules = _rules.Count };

        if (_dataModelInfo == null)
        {
            result.Success = false;
            result.Errors.Add("Data model information not available. Cannot determine data type for layout set.");
            return result;
        }

        var className = SanitizeClassName(_layoutSetName) + "DataProcessor";
        result.ClassName = className;

        var code = new StringBuilder();

        // Generate using statements
        GenerateUsingStatements(code);

        // Generate namespace and class declaration
        code.AppendLine();
        code.AppendLine("namespace Altinn.App.Logic;");
        code.AppendLine();
        code.AppendLine($"public class {className} : IDataWriteProcessor");
        code.AppendLine("{");

        GenerateProcessDataWriteMethod(code, result);
        GenerateRuleMethods(code, result);

        code.AppendLine("}");

        result.GeneratedCode = code.ToString();
        result.Success = result.Errors.Count == 0;

        return result;
    }

    private void GenerateUsingStatements(StringBuilder code)
    {
        code.AppendLine("using System;");
        code.AppendLine("using System.Collections.Generic;");
        code.AppendLine("using System.Linq;");
        code.AppendLine("using System.Threading.Tasks;");
        code.AppendLine("using Altinn.App.Core.Features;");
        code.AppendLine("using Altinn.App.Core.Models;");

        if (_dataModelInfo?.Namespace != null)
        {
            code.AppendLine($"using {_dataModelInfo.Namespace};");
        }
    }

    private void GenerateProcessDataWriteMethod(StringBuilder code, DataProcessorGenerationResult result)
    {
        var dataClassName = _dataModelInfo?.ClassName ?? "UNKNOWN_DATA_MODEL";

        code.AppendLine("    public async Task ProcessDataWrite(");
        code.AppendLine("        IInstanceDataMutator instanceDataMutator,");
        code.AppendLine("        string taskId,");
        code.AppendLine("        DataElementChanges changes,");
        code.AppendLine("        string? language)");
        code.AppendLine("    {");
        code.AppendLine(
            $"        var change = changes.FormDataChanges.FirstOrDefault(c => c.CurrentFormData is {dataClassName});"
        );
        code.AppendLine("        if (change == null)");
        code.AppendLine("        {");
        code.AppendLine("            return;");
        code.AppendLine("        }");
        code.AppendLine();
        code.AppendLine($"        var data = ({dataClassName})change.CurrentFormData;");
        code.AppendLine();

        foreach (var ruleEntry in _rules)
        {
            var ruleId = ruleEntry.Key;
            var rule = ruleEntry.Value;

            if (rule.InputParams == null || rule.InputParams.Count == 0)
            {
                Console.WriteLine($"[Warning] Rule '{ruleId}' has no input parameters - cannot generate invocation");
                continue;
            }

            var functionName = SanitizeFunctionName(rule.SelectedFunction ?? ruleId);
            code.AppendLine($"        await Rule_{functionName}(data);");
        }

        code.AppendLine("    }");
        code.AppendLine();
    }

    private void GenerateRuleMethods(StringBuilder code, DataProcessorGenerationResult result)
    {
        var dataClassName = _dataModelInfo?.ClassName ?? "UNKNOWN_DATA_MODEL";

        foreach (var ruleEntry in _rules)
        {
            var ruleId = ruleEntry.Key;
            var rule = ruleEntry.Value;

            var functionName = SanitizeFunctionName(rule.SelectedFunction ?? ruleId);
            var jsFunction = _jsParser.GetDataProcessingFunction(rule.SelectedFunction ?? "");

            code.AppendLine($"    private async Task Rule_{functionName}({dataClassName} data)");
            code.AppendLine("    {");

            if (jsFunction != null)
            {
                // Add original JavaScript as comment
                code.AppendLine($"        // Original JavaScript function: {rule.SelectedFunction}");
                var jsLines = jsFunction.Implementation.Split('\n');
                foreach (var line in jsLines)
                {
                    code.AppendLine($"        // {line}");
                }
                code.AppendLine();

                // Try to convert to C#
                var converter = new StatementConverter(rule.InputParams ?? new Dictionary<string, string>(), "data");
                CSharpConversionResult conversionResult;

                // Try to convert the full function if available, otherwise fall back to return expression
                if (jsFunction.FunctionAst != null)
                {
                    conversionResult = converter.ConvertFunction(jsFunction.FunctionAst);
                }
                else
                {
                    conversionResult = converter.ConvertFunctionBody(jsFunction.ReturnExpression);
                }

                if (conversionResult.Success && conversionResult.GeneratedCode != null)
                {
                    // Get the output parameter
                    var outputParam = rule.OutParams?.FirstOrDefault();
                    if (outputParam.HasValue && !string.IsNullOrEmpty(outputParam.Value.Value))
                    {
                        // Extract property path from data model path (returns dotted path like "Grp1.Grp2.Prop")
                        var propertyPath = ExtractPropertyNameFromPath(outputParam.Value.Value);
                        if (propertyPath != null)
                        {
                            // The generated code contains statements + the final return expression
                            // Split by newlines to separate statements from the return value
                            var lines = conversionResult.GeneratedCode.Split(
                                new[] { '\n', '\r' },
                                StringSplitOptions.RemoveEmptyEntries
                            );

                            // All lines except the last are statements (variable declarations)
                            for (int i = 0; i < lines.Length - 1; i++)
                            {
                                code.AppendLine(lines[i]);
                            }

                            // The last line is the return expression, assign it to the output property
                            var returnExpr =
                                lines.Length > 0 ? lines[^1].Trim() : conversionResult.GeneratedCode.Trim();
                            code.AppendLine($"        data.{propertyPath} = {returnExpr};");
                            result.SuccessfulConversions++;
                        }
                        else
                        {
                            var reason = "Could not extract property name from output path";
                            GenerateTodoStub(code, rule, reason, jsFunction.Implementation);
                            result.FailedConversions++;
                            result.FailedRules.Add(
                                new FailedRuleInfo
                                {
                                    RuleName = rule.SelectedFunction ?? ruleId,
                                    Reason = reason,
                                    JavaScriptSource = jsFunction.Implementation,
                                }
                            );
                        }
                    }
                    else
                    {
                        var reason = "No output parameter defined";
                        GenerateTodoStub(code, rule, reason, jsFunction.Implementation);
                        result.FailedConversions++;
                        result.FailedRules.Add(
                            new FailedRuleInfo
                            {
                                RuleName = rule.SelectedFunction ?? ruleId,
                                Reason = reason,
                                JavaScriptSource = jsFunction.Implementation,
                            }
                        );
                    }
                }
                else
                {
                    var reason = conversionResult.FailureReason ?? "Conversion failed";
                    GenerateTodoStub(code, rule, reason, jsFunction.Implementation);
                    result.FailedConversions++;
                    result.FailedRules.Add(
                        new FailedRuleInfo
                        {
                            RuleName = rule.SelectedFunction ?? ruleId,
                            Reason = reason,
                            JavaScriptSource = jsFunction.Implementation,
                        }
                    );
                }
            }
            else
            {
                var reason = "JavaScript function not found in RuleHandler.js";
                GenerateTodoStub(code, rule, reason);
                result.FailedConversions++;
                result.FailedRules.Add(
                    new FailedRuleInfo
                    {
                        RuleName = rule.SelectedFunction ?? ruleId,
                        Reason = reason,
                        JavaScriptSource = null,
                    }
                );
            }

            code.AppendLine("        await Task.CompletedTask;");
            code.AppendLine("    }");
            code.AppendLine();
        }
    }

    private void GenerateTodoStub(StringBuilder code, DataProcessingRule rule, string reason, string? jsSource = null)
    {
        code.AppendLine($"        // TODO: Manual conversion required - {reason}");

        if (rule.InputParams != null && rule.InputParams.Count > 0)
        {
            code.AppendLine("        // Input parameters:");
            foreach (var input in rule.InputParams)
            {
                code.AppendLine($"        //   {input.Key} -> {input.Value}");
            }
        }

        if (rule.OutParams != null && rule.OutParams.Count > 0)
        {
            code.AppendLine("        // Output parameters:");
            foreach (var output in rule.OutParams)
            {
                code.AppendLine($"        //   {output.Key} -> {output.Value}");
            }
        }

        code.AppendLine();
        code.AppendLine("        throw new NotImplementedException(\"This rule requires manual conversion\");");
    }

    private string SanitizeClassName(string name)
    {
        // Remove special characters and convert to PascalCase
        var sanitized = new string(name.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());
        return ToPascalCase(sanitized);
    }

    private string SanitizeFunctionName(string name)
    {
        // Remove special characters
        return new string(name.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());
    }

    private string ToPascalCase(string input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return input;
        }

        return char.ToUpper(input[0]) + input[1..];
    }

    private string? ExtractPropertyNameFromPath(string dataModelPath)
    {
        // Data model paths are like "Group-grp-123.SubGroup-grp-456.PropertyName-datadef-789.value"
        // We need to convert this to "Groupgrp123.SubGroupgrp456.PropertyNamedatadef789.value"
        var parts = dataModelPath.Split('.');

        // Sanitize each part (removes hyphens and invalid characters)
        // Note: "value" at the end is a valid property name and should be kept
        var sanitizedParts = parts.Select(SanitizePropertyName).Where(p => !string.IsNullOrEmpty(p)).ToArray();

        // Join with dots to create nested property access
        return sanitizedParts.Length > 0 ? string.Join(".", sanitizedParts) : null;
    }

    private string SanitizePropertyName(string propertyName)
    {
        // The C# model generator removes hyphens but keeps letters, digits, and underscores
        // This matches the auto-generated model property naming convention
        return new string(propertyName.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());
    }
}
