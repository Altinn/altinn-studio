using System.Text;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.DataProcessingRules;

/// <summary>
/// Result of a C# code conversion
/// </summary>
internal class CSharpConversionResult
{
    public bool Success { get; set; }
    public string? GeneratedCode { get; set; }
    public string? FailureReason { get; set; }
}

/// <summary>
/// Converts JavaScript statements and expressions to C# code
/// </summary>
internal class StatementConverter
{
    private readonly Dictionary<string, string> _inputParams;
    private readonly string _dataVariableName;
    private readonly Dictionary<string, string> _localVariables = new();
    private int _tempVarCounter = 0;

    public StatementConverter(Dictionary<string, string> inputParams, string dataVariableName = "data")
    {
        _inputParams = inputParams;
        _dataVariableName = dataVariableName;
    }

    /// <summary>
    /// Convert a full JavaScript function (IFunction) to C# code
    /// </summary>
    public CSharpConversionResult ConvertFunction(IFunction? function)
    {
        var result = new CSharpConversionResult();

        if (function == null)
        {
            result.Success = false;
            result.FailureReason = "Function is null";
            return result;
        }

        try
        {
            var code = new StringBuilder();
            var body = function.Body;

            if (body is BlockStatement blockBody)
            {
                // Convert all statements in the function body
                foreach (var statement in blockBody.Body)
                {
                    if (statement is ReturnStatement returnStmt)
                    {
                        // Handle return statement - this should be the final statement
                        if (returnStmt.Argument != null)
                        {
                            var returnCode = ConvertExpression(returnStmt.Argument);
                            code.Append(returnCode);
                        }
                        break; // Stop after return statement
                    }
                    else
                    {
                        // Convert and append other statements
                        var stmtCode = ConvertStatement(statement);
                        if (!string.IsNullOrEmpty(stmtCode))
                        {
                            code.AppendLine(stmtCode);
                        }
                    }
                }
            }
            else if (body is Expression expr)
            {
                // Arrow function with expression body
                code.Append(ConvertExpression(expr));
            }

            result.Success = true;
            result.GeneratedCode = code.ToString().TrimEnd();
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.FailureReason = $"Conversion failed: {ex.Message}";
        }

        return result;
    }

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
        }

        return result;
    }

    /// <summary>
    /// Convert a JavaScript statement to C# code
    /// </summary>
    private string ConvertStatement(Statement statement)
    {
        return statement switch
        {
            ExpressionStatement exprStmt => ConvertExpressionStatement(exprStmt),
            VariableDeclaration varDecl => ConvertVariableDeclaration(varDecl),
            IfStatement ifStmt => ConvertIfStatement(ifStmt),
            EmptyStatement => string.Empty, // Empty statements (just semicolons) can be ignored
            _ => throw new NotSupportedException($"Statement type {statement.Type} not supported for C# conversion"),
        };
    }

    private string ConvertExpressionStatement(ExpressionStatement exprStmt)
    {
        // Expression statements are typically assignments like: ikkeFordelt = 100 - (tall1 + tall2 + tall3);
        if (exprStmt.Expression is AssignmentExpression assignment)
        {
            return ConvertAssignmentExpression(assignment);
        }

        throw new NotSupportedException($"Expression statement pattern not supported");
    }

    private string ConvertVariableDeclaration(VariableDeclaration varDecl)
    {
        var code = new StringBuilder();

        foreach (var declarator in varDecl.Declarations)
        {
            if (declarator.Id is Identifier identifier)
            {
                var varName = identifier.Name;
                _localVariables[varName] = varName; // Track local variable

                if (declarator.Init != null)
                {
                    var initCode = ConvertExpression(declarator.Init);
                    code.AppendLine($"        var {varName} = {initCode};");
                }
                else
                {
                    code.AppendLine($"        var {varName};");
                }
            }
        }

        return code.ToString().TrimEnd();
    }

    private string ConvertIfStatement(IfStatement ifStmt)
    {
        var code = new StringBuilder();
        var condition = ConvertExpression(ifStmt.Test);

        code.AppendLine($"        if ({condition})");
        code.AppendLine("        {");

        // Convert the consequent (then branch)
        if (ifStmt.Consequent is BlockStatement block)
        {
            foreach (var stmt in block.Body)
            {
                var stmtCode = ConvertStatementInBlock(stmt);
                if (!string.IsNullOrEmpty(stmtCode))
                {
                    code.AppendLine($"    {stmtCode}");
                }
            }
        }
        else
        {
            var stmtCode = ConvertStatementInBlock(ifStmt.Consequent);
            if (!string.IsNullOrEmpty(stmtCode))
            {
                code.AppendLine($"    {stmtCode}");
            }
        }

        code.AppendLine("        }");

        // Handle else clause if present
        if (ifStmt.Alternate != null)
        {
            code.AppendLine("        else");
            code.AppendLine("        {");

            if (ifStmt.Alternate is BlockStatement elseBlock)
            {
                foreach (var stmt in elseBlock.Body)
                {
                    var stmtCode = ConvertStatementInBlock(stmt);
                    if (!string.IsNullOrEmpty(stmtCode))
                    {
                        code.AppendLine($"    {stmtCode}");
                    }
                }
            }
            else if (ifStmt.Alternate is IfStatement elseIf)
            {
                // Handle else if
                var elseIfCode = ConvertIfStatement(elseIf);
                code.AppendLine($"    {elseIfCode.TrimStart()}");
            }
            else
            {
                var stmtCode = ConvertStatementInBlock(ifStmt.Alternate);
                if (!string.IsNullOrEmpty(stmtCode))
                {
                    code.AppendLine($"    {stmtCode}");
                }
            }

            code.AppendLine("        }");
        }

        return code.ToString().TrimEnd();
    }

    private string ConvertStatementInBlock(Statement statement)
    {
        if (statement is ReturnStatement returnStmt)
        {
            // Return statements in if blocks need special handling
            if (returnStmt.Argument != null)
            {
                var returnCode = ConvertExpression(returnStmt.Argument);
                return $"return {returnCode};";
            }
            return "return;";
        }

        return ConvertStatement(statement);
    }

    private string ConvertAssignmentExpression(AssignmentExpression assignment)
    {
        if (assignment.Left is Identifier identifier)
        {
            var varName = identifier.Name;
            _localVariables[varName] = varName; // Track as local variable
            var rightCode = ConvertExpression(assignment.Right);
            return $"        var {varName} = {rightCode};";
        }

        // Handle member expression assignments like obj.property = value
        if (assignment.Left is MemberExpression memberExpr)
        {
            var leftSide = ConvertMemberExpression(memberExpr);
            var rightCode = ConvertExpression(assignment.Right);
            return $"        {leftSide} = {rightCode};";
        }

        throw new NotSupportedException($"Assignment pattern not supported");
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
            ConditionalExpression conditional => ConvertConditionalExpression(conditional),
            UnaryExpression unary => ConvertUnaryExpression(unary),
            CallExpression call => ConvertCallExpression(call),
            ArrowFunctionExpression arrow => ConvertArrowFunctionExpression(arrow),
            ChainExpression chain => ConvertChainExpression(chain),
            RegExpLiteral regex => ConvertRegExpLiteral(regex),
            TemplateLiteral template => ConvertTemplateLiteral(template),
            Literal literal => ConvertLiteral(literal), // Must come after more specific literal types
            _ => throw new NotSupportedException($"Expression type {expr.Type} not supported for C# conversion"),
        };
    }

    private string ConvertTemplateLiteral(TemplateLiteral template)
    {
        // Template literals like `hello ${name}` need to be converted to C# string interpolation
        // For now, we'll use a simplified approach
        if (template.Expressions.Count == 0)
        {
            // Simple template literal with no expressions - just a string
            return template.Quasis.Count > 0 && template.Quasis[0].Value.Cooked != null
                ? $"\"{EscapeString(template.Quasis[0].Value.Cooked)}\""
                : "\"\"";
        }

        // Template literal with expressions - convert to string interpolation
        var result = new StringBuilder("$\"");
        for (int i = 0; i < template.Quasis.Count; i++)
        {
            if (template.Quasis[i].Value.Cooked != null)
            {
                result.Append(EscapeString(template.Quasis[i].Value.Cooked));
            }

            if (i < template.Expressions.Count)
            {
                var expr = ConvertExpression(template.Expressions[i]);
                result.Append($"{{{expr}}}");
            }
        }
        result.Append("\"");
        return result.ToString();
    }

    private string ConvertRegExpLiteral(RegExpLiteral regex)
    {
        // RegExpLiteral in Acornima needs to be inspected for the correct properties
        // For now, we'll throw an unsupported exception as regex conversion is complex
        // and may require looking at the Raw property to extract the pattern
        throw new NotSupportedException("Regular expression literals require manual conversion");
    }

    private string ConvertChainExpression(ChainExpression chain)
    {
        // ChainExpression wraps optional chaining expressions like obj?.prop
        // The actual expression is in chain.Expression
        return ConvertExpression(chain.Expression);
    }

    private string ConvertArrowFunctionExpression(ArrowFunctionExpression arrow)
    {
        // Arrow functions in data processing rules are typically used as inline functions
        // For now, we'll convert the body and return it as a lambda expression
        // This is a simplified implementation and may need enhancement for complex cases

        if (arrow.Body is Expression bodyExpr)
        {
            // Simple arrow function: x => expression
            var body = ConvertExpression(bodyExpr);

            if (arrow.Params.Count == 1 && arrow.Params[0] is Identifier param)
            {
                return $"({param.Name} => {body})";
            }

            // Multiple parameters
            var paramList = string.Join(", ", arrow.Params.OfType<Identifier>().Select(p => p.Name));
            return $"(({paramList}) => {body})";
        }
        else if (arrow.Body is BlockStatement blockStmt)
        {
            // Arrow function with block body: x => { statements }
            // This is more complex and may need to be converted to a full method
            throw new NotSupportedException("Arrow functions with block statements are not yet supported");
        }

        throw new NotSupportedException("Unsupported arrow function pattern");
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
        // Handle special JavaScript global identifiers
        if (identifier.Name == "Infinity")
        {
            return "double.PositiveInfinity";
        }

        if (identifier.Name == "undefined")
        {
            return "null";
        }

        // Check if this is a local variable
        if (_localVariables.ContainsKey(identifier.Name))
        {
            return identifier.Name;
        }

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
        // Special pattern: obj.property ? +obj.property : 0
        // This is JavaScript's way of "convert to number or default to 0"
        // We can simplify this to just the unary plus conversion
        if (
            conditional.Consequent is UnaryExpression unary
            && unary.Operator.ToString() == "UnaryPlus"
            && conditional.Alternate is Literal literal
            && literal.Value is int or long or double
            && Convert.ToDouble(literal.Value) == 0
        )
        {
            // Just use the unary plus conversion directly, which already handles the fallback to 0
            return ConvertUnaryPlus(unary.Argument);
        }

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
            "UnaryPlus" or "Plus" or "+" => ConvertUnaryPlus(unary.Argument),
            "UnaryMinus" or "Minus" or "-" => $"(-{argument})",
            "UnaryNegation" or "~" => $"(~{argument})",
            _ => throw new NotSupportedException($"Unary operator {operatorStr} not supported"),
        };
    }

    private string ConvertUnaryPlus(Expression argument)
    {
        // In JavaScript, +obj.property coerces to number
        // In C#, we need explicit conversion
        var expr = ConvertExpression(argument);

        // Generate unique temp variable name
        var tempVar = $"_temp{_tempVarCounter++}";

        // Try to determine if we need decimal or int conversion
        // For now, use decimal for safety
        return $"(decimal.TryParse({expr}?.ToString(), out var {tempVar}) ? {tempVar} : 0)";
    }

    private string ConvertLogicalExpression(LogicalExpression logical)
    {
        var left = ConvertExpression(logical.Left);
        var right = ConvertExpression(logical.Right);
        var operatorStr = logical.Operator.ToString();

        var op = operatorStr switch
        {
            "And" or "&&" or "LogicalAnd" => "&&",
            "Or" or "||" or "LogicalOr" => "||",
            "NullishCoalescing" or "??" => "??",
            _ => throw new NotSupportedException($"Logical operator {operatorStr} not supported"),
        };

        return $"({left} {op} {right})";
    }

    private string ConvertCallExpression(CallExpression call)
    {
        // Handle global function calls (no object)
        if (call.Callee is Identifier globalFunc)
        {
            switch (globalFunc.Name)
            {
                case "parseInt":
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        return $"int.Parse({value})";
                    }
                    throw new NotSupportedException("parseInt requires an argument");

                case "parseFloat":
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        return $"double.Parse({value})";
                    }
                    throw new NotSupportedException("parseFloat requires an argument");

                case "isNaN":
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        return $"double.IsNaN({value})";
                    }
                    throw new NotSupportedException("isNaN requires an argument");

                case "isFinite":
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        return $"(!double.IsInfinity({value}) && !double.IsNaN({value}))";
                    }
                    throw new NotSupportedException("isFinite requires an argument");

                case "Number":
                    // Number(x) converts to number, similar to parseFloat but handles more cases
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        return $"Convert.ToDouble({value})";
                    }
                    return "0"; // Number() with no args returns 0

                case "String":
                    // String(x) converts to string
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        return $"Convert.ToString({value})";
                    }
                    return "\"\""; // String() with no args returns empty string

                default:
                    throw new NotSupportedException($"Global function {globalFunc.Name} not supported");
            }
        }

        // Handle specific method calls
        if (call.Callee is MemberExpression member && member.Property is Identifier methodName)
        {
            var obj = ConvertExpression(member.Object);

            // Check if we need null-conditional operator
            // Local variables don't need it, but data model properties might
            var isLocalVariable = member.Object is Identifier id && _localVariables.ContainsKey(id.Name);
            var nullConditional = isLocalVariable ? "" : "?";

            switch (methodName.Name)
            {
                case "toString":
                    return $"{obj}{nullConditional}.ToString()";

                case "toUpperCase":
                    return $"{obj}{nullConditional}.ToUpper()";

                case "toLowerCase":
                    return $"{obj}{nullConditional}.ToLower()";

                case "trim":
                    return $"{obj}{nullConditional}.Trim()";

                case "split":
                    // Handle split with arguments
                    if (call.Arguments.Count > 0)
                    {
                        var separator = ConvertExpression(call.Arguments[0]);
                        return $"{obj}{nullConditional}.Split({separator})";
                    }
                    return $"{obj}{nullConditional}.Split()";

                case "includes":
                    // Handle includes (Contains in C#)
                    if (call.Arguments.Count > 0)
                    {
                        var searchValue = ConvertExpression(call.Arguments[0]);
                        return $"{obj}{nullConditional}.Contains({searchValue})";
                    }
                    throw new NotSupportedException("includes method requires an argument");

                case "round":
                    // Math.round() -> Math.Round()
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        return $"Math.Round({value})";
                    }
                    throw new NotSupportedException("round method requires an argument");

                case "toFixed":
                    // number.toFixed(decimals) -> Math.Round(number, decimals)
                    if (call.Arguments.Count > 0)
                    {
                        var decimals = ConvertExpression(call.Arguments[0]);
                        return $"Math.Round({obj} ?? 0, {decimals})";
                    }
                    return $"Math.Round({obj} ?? 0, 0)";

                case "parseInt":
                    // parseInt(str) -> int.Parse(str)
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        return $"int.Parse({value})";
                    }
                    throw new NotSupportedException("parseInt requires an argument");

                case "parseFloat":
                    // parseFloat(str) -> double.Parse(str)
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        return $"double.Parse({value})";
                    }
                    throw new NotSupportedException("parseFloat requires an argument");

                case "test":
                    // regex.test(str) -> Regex.IsMatch(str, pattern)
                    // Note: obj should be a regex literal, but we'll handle it as a pattern string
                    if (call.Arguments.Count > 0)
                    {
                        var testString = ConvertExpression(call.Arguments[0]);
                        // For now, assume obj is a regex literal that needs to be extracted
                        // This is a simplified implementation
                        return $"System.Text.RegularExpressions.Regex.IsMatch({testString}, {obj})";
                    }
                    throw new NotSupportedException("test method requires an argument");

                case "forEach":
                    // forEach is complex and often requires restructuring
                    throw new NotSupportedException(
                        "forEach method requires manual conversion - use a foreach loop instead"
                    );

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
