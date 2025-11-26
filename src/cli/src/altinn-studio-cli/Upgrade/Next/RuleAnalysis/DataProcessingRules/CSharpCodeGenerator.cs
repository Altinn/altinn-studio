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

        // Check for JS functions used by multiple rules
        var functionUsageCount = new Dictionary<string, List<string>>();
        foreach (var ruleEntry in _rules)
        {
            var ruleId = ruleEntry.Key;
            var rule = ruleEntry.Value;
            var functionName = rule.SelectedFunction ?? "";

            if (!string.IsNullOrEmpty(functionName))
            {
                if (!functionUsageCount.ContainsKey(functionName))
                {
                    functionUsageCount[functionName] = new List<string>();
                }
                functionUsageCount[functionName].Add(ruleId);
            }
        }

        // Find functions used by multiple rules
        var sharedFunctions = functionUsageCount
            .Where(kvp => kvp.Value.Count > 1)
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

        var className = SanitizeClassName(_layoutSetName) + "DataProcessor";
        result.ClassName = className;

        var code = new IndentedStringBuilder();

        // Generate using statements
        GenerateUsingStatements(code);

        // Generate namespace and class declaration
        code.AppendLine();
        code.AppendLine("namespace Altinn.App.Logic;");
        code.AppendLine();
        code.AppendLine($"public class {className} : IDataWriteProcessor");
        code.OpenBrace();

        GenerateProcessDataWriteMethod(code, result);
        GenerateSharedHelperMethods(code, result, sharedFunctions);
        GenerateRuleMethods(code, result, sharedFunctions);

        code.CloseBrace();

        result.GeneratedCode = code.ToString();
        result.Success = result.Errors.Count == 0;

        return result;
    }

    private void GenerateUsingStatements(IndentedStringBuilder code)
    {
        code.AppendLine("using System;");
        code.AppendLine("using System.Collections.Generic;");
        code.AppendLine("using System.Linq;");
        code.AppendLine("using System.Threading.Tasks;");
        code.AppendLine("using Altinn.App.Core.Features;");
        code.AppendLine("using Altinn.App.Core.Models;");
        code.AppendLine("using Altinn.App.Core.Internal.Data;");

        if (_dataModelInfo?.Namespace != null)
        {
            code.AppendLine($"using {_dataModelInfo.Namespace};");
        }
    }

    private void GenerateProcessDataWriteMethod(IndentedStringBuilder code, DataProcessorGenerationResult result)
    {
        var dataClassName = _dataModelInfo?.ClassName ?? "UNKNOWN_DATA_MODEL";

        code.AppendLine("public async Task ProcessDataWrite(");
        code.Indent();
        code.AppendLine("IInstanceDataMutator instanceDataMutator,");
        code.AppendLine("string taskId,");
        code.AppendLine("DataElementChanges changes,");
        code.AppendLine("string? language)");
        code.Unindent();
        code.OpenBrace();

        code.AppendLine(
            $"var change = changes.FormDataChanges.FirstOrDefault(c => c.CurrentFormData is {dataClassName});"
        );
        code.AppendLine("if (change == null)");
        code.OpenBrace();
        code.AppendLine("return;");
        code.CloseBrace();
        code.AppendLine();
        code.AppendLine("var wrapper = change.CurrentFormDataWrapper;");
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

            var methodName = SanitizeFunctionName(ruleId);
            code.AppendLine($"await Rule_{methodName}(wrapper);");
        }

        code.CloseBrace();
        code.AppendLine();
    }

    private void GenerateSharedHelperMethods(
        IndentedStringBuilder code,
        DataProcessorGenerationResult result,
        Dictionary<string, List<string>> sharedFunctions
    )
    {
        if (sharedFunctions.Count == 0)
        {
            return;
        }

        code.AppendLine("// Shared helper methods for functions used by multiple rules");
        code.AppendLine();

        foreach (var sharedFunctionEntry in sharedFunctions)
        {
            var functionName = sharedFunctionEntry.Key;
            var jsFunction = _jsParser.GetDataProcessingFunction(functionName);

            if (jsFunction == null)
            {
                code.AppendLine($"// WARNING: Could not find JavaScript function '{functionName}'");
                code.AppendLine();
                continue;
            }

            var methodName = SanitizeFunctionName(functionName);
            code.AppendLine($"// Shared helper for JS function '{functionName}'");
            code.AppendLine($"// Used by rules: {string.Join(", ", sharedFunctionEntry.Value)}");

            code.AppendLine($"private object? Helper_{methodName}(Dictionary<string, object?> obj)");
            code.OpenBrace();

            // Add original JavaScript as comment
            code.AppendLine($"// Original JavaScript function: {functionName}");
            var jsLines = jsFunction.Implementation.Split('\n');
            foreach (var line in jsLines)
            {
                code.AppendLine($"// {line}");
            }
            code.AppendLine();

            // Try to convert the function using a special "dictionary mode"
            // Extract all property names used in the JS function
            var allPossibleKeys = new HashSet<string>();

            // First, add all keys that are used by any rule calling this function
            foreach (var ruleId in sharedFunctionEntry.Value)
            {
                if (_rules.TryGetValue(ruleId, out var ruleForFunction) && ruleForFunction.InputParams != null)
                {
                    foreach (var key in ruleForFunction.InputParams.Keys)
                    {
                        allPossibleKeys.Add(key);
                    }
                }
            }

            // Also extract property names from the JS function implementation itself
            // Look for patterns like "obj.propertyName"
            var jsCode = jsFunction.Implementation;
            var propertyMatches = System.Text.RegularExpressions.Regex.Matches(
                jsCode,
                @"obj\.([a-z_][a-z0-9_]*)\b",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase
            );
            foreach (System.Text.RegularExpressions.Match match in propertyMatches)
            {
                if (match.Groups.Count > 1)
                {
                    allPossibleKeys.Add(match.Groups[1].Value);
                }
            }

            // Detect which properties are used with string/array methods (includes, contains, etc.)
            var stringArrayKeys = new HashSet<string>();
            foreach (var key in allPossibleKeys)
            {
                // Check if property is used with .includes() or other string/array methods
                if (
                    System.Text.RegularExpressions.Regex.IsMatch(
                        jsCode,
                        $@"\b{key}\.includes\b",
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase
                    )
                )
                {
                    stringArrayKeys.Add(key);
                }
            }

            // Generate code manually for common patterns
            // Try to detect if this is a simple arithmetic function
            var implLower = jsFunction.Implementation.ToLower();
            var isSimpleArithmetic =
                implLower.Contains("return")
                && (
                    implLower.Contains("+")
                    || implLower.Contains("-")
                    || implLower.Contains("*")
                    || implLower.Contains("/")
                );

            if (isSimpleArithmetic && allPossibleKeys.Count > 0 && allPossibleKeys.Count <= 10)
            {
                // Generate code to parse and default each parameter
                foreach (var key in allPossibleKeys.OrderBy(k => k))
                {
                    // Check if this property is used with string/array methods
                    if (stringArrayKeys.Contains(key))
                    {
                        // Keep as object? for string/array operations
                        code.AppendLine(
                            $"var {key} = obj.TryGetValue(\"{key}\", out var _{key}Val) ? _{key}Val : null;"
                        );
                    }
                    else
                    {
                        // Parse as decimal for numeric operations
                        code.AppendLine(
                            $"var {key} = obj.TryGetValue(\"{key}\", out var _{key}Val) && _{key}Val != null"
                        );
                        code.Indent();
                        code.AppendLine(
                            $"? (decimal.TryParse(_{key}Val.ToString(), out var _{key}Parsed) ? _{key}Parsed : 0)"
                        );
                        code.AppendLine(": 0;");
                        code.Unindent();
                    }
                }
                code.AppendLine();

                // Try to convert the return expression
                var converter = new StatementConverter(new Dictionary<string, string>(), "");
                CSharpConversionResult conversionResult;

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
                    // The conversion generated code with `obj.a`, `obj.b`, etc. or possibly just `.A`, `.B`, etc.
                    // We want to replace these with our local variables `a`, `b`, etc.
                    var convertedCode = conversionResult.GeneratedCode;

                    // Replace obj.propertyName with just propertyName (case-insensitive)
                    foreach (var key in allPossibleKeys)
                    {
                        // Replace obj.key (case-insensitive)
                        convertedCode = System.Text.RegularExpressions.Regex.Replace(
                            convertedCode,
                            $@"\bobj\.{key}\b",
                            key,
                            System.Text.RegularExpressions.RegexOptions.IgnoreCase
                        );

                        // Also replace standalone .KEY (uppercase version from failed conversion)
                        var keyUpper = key.ToUpper();
                        convertedCode = System.Text.RegularExpressions.Regex.Replace(
                            convertedCode,
                            $@"\.{keyUpper}\b",
                            key
                        );

                        // For string/array keys, fix up Contains calls to add ToString()
                        // Replace patterns like "checkboxlist?.Contains(" with "checkboxlist?.ToString()?.Contains("
                        if (stringArrayKeys.Contains(key))
                        {
                            convertedCode = System.Text.RegularExpressions.Regex.Replace(
                                convertedCode,
                                $@"\b{key}\?\.Contains\(",
                                $"{key}?.ToString()?.Contains(",
                                System.Text.RegularExpressions.RegexOptions.IgnoreCase
                            );
                        }
                    }

                    var lines = convertedCode.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var line in lines)
                    {
                        var trimmedLine = line.TrimEnd();
                        // Skip lines that are just variable assignments from the function body
                        // (we already generated those above with TryGetValue)
                        // Also skip lines that start with a property access like ".A =" which are broken conversions
                        if (
                            !string.IsNullOrWhiteSpace(trimmedLine)
                            && !System.Text.RegularExpressions.Regex.IsMatch(
                                trimmedLine,
                                @"^\s*[a-z]\s*=\s*\(decimal\.TryParse"
                            )
                            && !System.Text.RegularExpressions.Regex.IsMatch(trimmedLine, @"^\s*\.[A-Z]")
                        )
                        {
                            code.AppendLine(trimmedLine);
                        }
                    }
                }
                else
                {
                    code.AppendLine("// TODO: Automatic conversion failed");
                    code.AppendLine(
                        "throw new NotImplementedException(\"Shared helper function requires manual implementation\");"
                    );
                }
            }
            else
            {
                code.AppendLine("// TODO: Implement this shared helper function");
                code.AppendLine("// This function is called by multiple rules with different parameter mappings");
                code.AppendLine(
                    "throw new NotImplementedException(\"Shared helper function requires manual implementation\");"
                );
            }

            code.CloseBrace();
            code.AppendLine();
        }
    }

    private void GenerateRuleMethods(
        IndentedStringBuilder code,
        DataProcessorGenerationResult result,
        Dictionary<string, List<string>> sharedFunctions
    )
    {
        var dataClassName = _dataModelInfo?.ClassName ?? "UNKNOWN_DATA_MODEL";

        foreach (var ruleEntry in _rules)
        {
            var ruleId = ruleEntry.Key;
            var rule = ruleEntry.Value;

            var methodName = SanitizeFunctionName(ruleId);
            var jsFunction = _jsParser.GetDataProcessingFunction(rule.SelectedFunction ?? "");

            code.AppendLine($"private async Task Rule_{methodName}(IFormDataWrapper wrapper)");
            code.OpenBrace();

            if (jsFunction != null)
            {
                // Check if this function is shared
                var functionName = rule.SelectedFunction ?? "";
                var isSharedFunction = sharedFunctions.ContainsKey(functionName);

                if (isSharedFunction)
                {
                    // For shared functions, generate code that calls the helper method
                    code.AppendLine($"// Calls shared helper: {functionName}");
                    code.AppendLine();

                    // Get the output parameter
                    var outputParam = rule.OutParams?.FirstOrDefault();
                    string? outputFieldPath = null;

                    if (outputParam.HasValue && !string.IsNullOrEmpty(outputParam.Value.Value))
                    {
                        outputFieldPath = outputParam.Value.Value;
                    }
                    else
                    {
                        outputFieldPath = InferOutputFieldFromRuleName(ruleId, rule.SelectedFunction);
                    }

                    if (
                        !string.IsNullOrEmpty(outputFieldPath)
                        && rule.InputParams != null
                        && rule.InputParams.Count > 0
                    )
                    {
                        // Create a dictionary with the input parameter mappings
                        code.AppendLine("var inputObj = new Dictionary<string, object?>");
                        code.OpenBrace();
                        foreach (var inputParam in rule.InputParams)
                        {
                            code.AppendLine($"[\"{inputParam.Key}\"] = wrapper.Get(\"{inputParam.Value}\"),");
                        }
                        code.Unindent();
                        code.AppendLine("};");
                        code.AppendLine();

                        // Call the helper method
                        var helperMethodName = SanitizeFunctionName(functionName);
                        code.AppendLine($"var result = Helper_{helperMethodName}(inputObj);");
                        // Set the result using wrapper.Set()
                        code.AppendLine($"wrapper.Set(\"{outputFieldPath}\", result);");

                        result.SuccessfulConversions++;
                    }
                    else
                    {
                        var reason = string.IsNullOrEmpty(outputFieldPath)
                            ? "Could not determine output field"
                            : "No input parameters defined";
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
                    // For non-shared functions, use the original inline conversion
                    // Add original JavaScript as comment
                    code.AppendLine($"// Original JavaScript function: {rule.SelectedFunction}");
                    var jsLines = jsFunction.Implementation.Split('\n');
                    foreach (var line in jsLines)
                    {
                        code.AppendLine($"// {line}");
                    }
                    code.AppendLine();

                    // Try to convert to C#
                    var converter = new StatementConverter(
                        rule.InputParams ?? new Dictionary<string, string>(),
                        "wrapper",
                        useFormDataWrapper: true
                    );
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
                        string? outputFieldPath = null;

                        if (outputParam.HasValue && !string.IsNullOrEmpty(outputParam.Value.Value))
                        {
                            outputFieldPath = outputParam.Value.Value;
                        }
                        else
                        {
                            // Try to infer output field from rule connection name
                            // Pattern: {target-field}-{function-name} -> extract target-field
                            outputFieldPath = InferOutputFieldFromRuleName(ruleId, rule.SelectedFunction);
                        }

                        if (!string.IsNullOrEmpty(outputFieldPath))
                        {
                            // The generated code already has proper indentation from IndentedStringBuilder
                            // Split by newlines to process statements and replace return statements with assignments
                            var lines = conversionResult.GeneratedCode.Split(
                                new[] { '\n', '\r' },
                                StringSplitOptions.RemoveEmptyEntries
                            );

                            // Process each line and replace return statements with wrapper.Set() calls
                            for (int i = 0; i < lines.Length; i++)
                            {
                                var line = lines[i].TrimEnd();
                                var trimmedLine = line.Trim();

                                // If this line is a return statement, convert it to a wrapper.Set() call
                                if (trimmedLine.StartsWith("return ") && trimmedLine.EndsWith(";"))
                                {
                                    var returnExpr = trimmedLine.Substring(7, trimmedLine.Length - 8); // Extract expression between "return " and ";"
                                    // Preserve the original indentation
                                    var indent =
                                        line.Length > trimmedLine.Length
                                            ? line.Substring(0, line.IndexOf(trimmedLine))
                                            : "";
                                    code.AppendLine($"{indent}wrapper.Set(\"{outputFieldPath}\", {returnExpr});");
                                }
                                else if (trimmedLine == "return;")
                                {
                                    // Empty return statement - just skip it
                                    continue;
                                }
                                else if (trimmedLine.StartsWith("return "))
                                {
                                    // Multi-line return statement - collect all lines until we find the semicolon
                                    var returnParts = new System.Text.StringBuilder();
                                    returnParts.Append(trimmedLine.Substring(7)); // Remove "return "

                                    // Save original indentation from first line
                                    var indent =
                                        line.Length > trimmedLine.Length
                                            ? line.Substring(0, line.IndexOf(trimmedLine))
                                            : "";

                                    while (i + 1 < lines.Length && !line.Contains(";"))
                                    {
                                        i++;
                                        line = lines[i].TrimEnd();
                                        returnParts.Append(" ");
                                        returnParts.Append(line.Trim());
                                    }

                                    var returnExpr = returnParts.ToString();
                                    if (returnExpr.EndsWith(";"))
                                    {
                                        returnExpr = returnExpr.Substring(0, returnExpr.Length - 1);
                                    }
                                    code.AppendLine($"{indent}wrapper.Set(\"{outputFieldPath}\", {returnExpr});");
                                }
                                else if (!string.IsNullOrWhiteSpace(line))
                                {
                                    // Output the line as-is since it already has no indentation from the converter
                                    code.AppendLine(line);
                                }
                            }
                            result.SuccessfulConversions++;
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

            code.AppendLine("await Task.CompletedTask;");
            code.CloseBrace();
            code.AppendLine();
        }
    }

    private void GenerateTodoStub(
        IndentedStringBuilder code,
        DataProcessingRule rule,
        string reason,
        string? jsSource = null
    )
    {
        code.AppendLine($"// TODO: Manual conversion required - {reason}");

        if (rule.InputParams != null && rule.InputParams.Count > 0)
        {
            code.AppendLine("// Input parameters:");
            foreach (var input in rule.InputParams)
            {
                code.AppendLine($"//   {input.Key} -> {input.Value}");
            }
        }

        if (rule.OutParams != null && rule.OutParams.Count > 0)
        {
            code.AppendLine("// Output parameters:");
            foreach (var output in rule.OutParams)
            {
                code.AppendLine($"//   {output.Key} -> {output.Value}");
            }
        }

        code.AppendLine();
        code.AppendLine("throw new NotImplementedException(\"This rule requires manual conversion\");");
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

    private string? InferOutputFieldFromRuleName(string ruleConnectionName, string? functionName)
    {
        // Try to infer output field from rule connection name
        // Pattern: {target-field}-{function-name} -> extract target-field
        // Example: "02-gjester-sum" with function "sum" -> "02-gjester"

        if (string.IsNullOrEmpty(functionName))
        {
            return null;
        }

        // Try to remove "-{functionName}" suffix from the rule connection name
        var suffix = $"-{functionName}";
        if (ruleConnectionName.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
        {
            var targetField = ruleConnectionName.Substring(0, ruleConnectionName.Length - suffix.Length);
            if (!string.IsNullOrEmpty(targetField))
            {
                // Return the inferred field name (it will be sanitized by ExtractPropertyNameFromPath)
                return targetField;
            }
        }

        return null;
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
        var sanitized = new string(propertyName.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());

        // C# identifiers cannot start with a digit. If the sanitized name starts with a digit,
        // prefix it with an underscore (common convention in auto-generated code)
        if (!string.IsNullOrEmpty(sanitized) && char.IsDigit(sanitized[0]))
        {
            sanitized = "_" + sanitized;
        }

        return sanitized;
    }
}
