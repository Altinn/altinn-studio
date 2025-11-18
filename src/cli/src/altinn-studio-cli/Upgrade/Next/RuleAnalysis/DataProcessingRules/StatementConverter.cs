using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.DataProcessingRules;

/// <summary>
/// Result of a C# code conversion
/// </summary>
internal class CSharpConversionResult
{
    public bool Success { get; set; }
    public string? GeneratedCode { get; set; }
    public List<string> Warnings { get; } = new();
    public string? FailureReason { get; set; }
}

/// <summary>
/// Converts JavaScript statements and expressions to C# code
/// </summary>
internal class StatementConverter
{
    private readonly Dictionary<string, string> _inputParams;
    private readonly string _dataVariableName;
    private readonly List<string> _debugInfo = new();

    public StatementConverter(Dictionary<string, string> inputParams, string dataVariableName = "data")
    {
        _inputParams = inputParams;
        _dataVariableName = dataVariableName;
    }

    public List<string> DebugInfo => _debugInfo;

    /// <summary>
    /// Convert a JavaScript function body to C# code
    /// </summary>
    public CSharpConversionResult ConvertFunctionBody(Expression? functionBody)
    {
        var result = new CSharpConversionResult();

        if (functionBody == null)
        {
            result.Success = false;
            result.FailureReason = "Function body is null";
            return result;
        }

        try
        {
            var code = ConvertExpression(functionBody);
            result.Success = true;
            result.GeneratedCode = code;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.FailureReason = $"Conversion failed: {ex.Message}";
            _debugInfo.Add($"Exception during conversion: {ex}");
        }

        return result;
    }

    /// <summary>
    /// Convert a JavaScript expression to C# code
    /// </summary>
    private string ConvertExpression(Expression expr)
    {
        return expr switch
        {
            LogicalExpression logical => ConvertLogicalExpression(logical),
            BinaryExpression binary => ConvertBinaryExpression(binary),
            MemberExpression member => ConvertMemberExpression(member),
            Identifier identifier => ConvertIdentifier(identifier),
            Literal literal => ConvertLiteral(literal),
            ConditionalExpression conditional => ConvertConditionalExpression(conditional),
            UnaryExpression unary => ConvertUnaryExpression(unary),
            CallExpression call => ConvertCallExpression(call),
            _ => throw new NotSupportedException($"Expression type {expr.Type} not supported for C# conversion"),
        };
    }

    private string ConvertBinaryExpression(BinaryExpression binary)
    {
        var left = ConvertExpression(binary.Left);
        var right = ConvertExpression(binary.Right);

        var operatorStr = binary.Operator.ToString();
        var op = operatorStr switch
        {
            "Addition" or "+" => "+",
            "Subtraction" or "-" => "-",
            "Multiplication" or "*" => "*",
            "Division" or "/" => "/",
            "Remainder" or "%" => "%",
            "Equality" or "==" => "==",
            "Inequality" or "!=" => "!=",
            "StrictEquality" or "===" => "==",
            "StrictInequality" or "!==" => "!=",
            "GreaterThan" or ">" => ">",
            "GreaterThanOrEqual" or ">=" => ">=",
            "LessThan" or "<" => "<",
            "LessThanOrEqual" or "<=" => "<=",
            _ => throw new NotSupportedException($"Binary operator {operatorStr} not supported"),
        };

        return $"({left} {op} {right})";
    }

    private string ConvertMemberExpression(MemberExpression member)
    {
        // Handle obj.property -> data.Property
        if (member.Object is Identifier objId && member.Property is Identifier propId)
        {
            var propertyName = propId.Name;

            // Check if this property is a known input parameter
            if (_inputParams.ContainsKey(propertyName))
            {
                // Get the full data model path for this parameter
                var dataModelPath = _inputParams[propertyName];

                // Convert the path to C# property access
                var propertyPath = ExtractPropertyNameFromPath(dataModelPath);
                if (propertyPath != null)
                {
                    return $"{_dataVariableName}.{propertyPath}";
                }
            }

            // Fallback: convert to Pascal case for C# property names
            var csharpPropertyName = ToPascalCase(propertyName);
            return $"{_dataVariableName}.{csharpPropertyName}";
        }

        throw new NotSupportedException($"Member expression pattern not supported: {member}");
    }

    private string ConvertIdentifier(Identifier identifier)
    {
        // Check if this is a known input parameter
        if (_inputParams.ContainsKey(identifier.Name))
        {
            // Get the full data model path for this parameter
            var dataModelPath = _inputParams[identifier.Name];

            // Convert the path to C# property access
            var propertyPath = ExtractPropertyNameFromPath(dataModelPath);
            if (propertyPath != null)
            {
                return $"{_dataVariableName}.{propertyPath}";
            }
        }

        // Otherwise, keep the identifier as-is (might be a local variable)
        return identifier.Name;
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

    private string ConvertLiteral(Literal literal)
    {
        if (literal.Value == null)
        {
            return "null";
        }

        return literal.Value switch
        {
            string str => $"\"{EscapeString(str)}\"",
            bool b => b ? "true" : "false",
            int or long or double or float => literal.Raw ?? literal.Value.ToString() ?? "0",
            _ => literal.Raw ?? literal.Value.ToString() ?? "null",
        };
    }

    private string ConvertConditionalExpression(ConditionalExpression conditional)
    {
        var test = ConvertExpression(conditional.Test);
        var consequent = ConvertExpression(conditional.Consequent);
        var alternate = ConvertExpression(conditional.Alternate);

        return $"({test} ? {consequent} : {alternate})";
    }

    private string ConvertUnaryExpression(UnaryExpression unary)
    {
        var argument = ConvertExpression(unary.Argument);
        var operatorStr = unary.Operator.ToString();

        return operatorStr switch
        {
            "LogicalNot" or "!" => $"(!{argument})",
            "Plus" or "+" => ConvertUnaryPlus(unary.Argument),
            "Minus" or "-" => $"(-{argument})",
            _ => throw new NotSupportedException($"Unary operator {operatorStr} not supported"),
        };
    }

    private string ConvertUnaryPlus(Expression argument)
    {
        // In JavaScript, +obj.property coerces to number
        // In C#, we need explicit conversion
        var expr = ConvertExpression(argument);

        // Try to determine if we need decimal or int conversion
        // For now, use decimal for safety
        return $"(decimal.TryParse({expr}?.ToString(), out var _temp) ? _temp : 0)";
    }

    private string ConvertLogicalExpression(LogicalExpression logical)
    {
        var left = ConvertExpression(logical.Left);
        var right = ConvertExpression(logical.Right);
        var operatorStr = logical.Operator.ToString();

        var op = operatorStr switch
        {
            "And" or "&&" => "&&",
            "Or" or "||" => "||",
            _ => throw new NotSupportedException($"Logical operator {operatorStr} not supported"),
        };

        return $"({left} {op} {right})";
    }

    private string ConvertCallExpression(CallExpression call)
    {
        // Handle specific method calls
        if (call.Callee is MemberExpression member && member.Property is Identifier methodName)
        {
            var obj = ConvertExpression(member.Object);

            switch (methodName.Name)
            {
                case "toString":
                    return $"{obj}?.ToString()";

                case "toUpperCase":
                    return $"{obj}?.ToUpper()";

                case "toLowerCase":
                    return $"{obj}?.ToLower()";

                case "trim":
                    return $"{obj}?.Trim()";

                default:
                    throw new NotSupportedException($"Method call {methodName.Name} not supported");
            }
        }

        throw new NotSupportedException($"Call expression pattern not supported");
    }

    /// <summary>
    /// Convert camelCase or snake_case to PascalCase
    /// </summary>
    private string ToPascalCase(string input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return input;
        }

        // Simple conversion: capitalize first letter
        return char.ToUpper(input[0]) + input[1..];
    }

    private string EscapeString(string str)
    {
        return str.Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", "\\n")
            .Replace("\r", "\\r")
            .Replace("\t", "\\t");
    }
}
