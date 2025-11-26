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
            var code = new IndentedStringBuilder();
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
                            code.AppendLine($"return {returnCode};");
                        }
                        else
                        {
                            code.AppendLine("return null;");
                        }
                        break; // Stop after return statement
                    }
                    else
                    {
                        // Convert and append other statements
                        ConvertStatementWithIndent(statement, code);
                    }
                }
            }
            else if (body is Expression expr)
            {
                // Arrow function with expression body
                code.AppendLine($"return {ConvertExpression(expr)};");
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
    /// Convert a JavaScript statement to C# code and write it with proper indentation
    /// </summary>
    private void ConvertStatementWithIndent(Statement statement, IndentedStringBuilder code)
    {
        switch (statement)
        {
            case ExpressionStatement exprStmt:
                ConvertExpressionStatement(exprStmt, code);
                break;
            case VariableDeclaration varDecl:
                ConvertVariableDeclaration(varDecl, code);
                break;
            case IfStatement ifStmt:
                ConvertIfStatement(ifStmt, code);
                break;
            case ReturnStatement returnStmt:
                if (returnStmt.Argument != null)
                {
                    var returnCode = ConvertExpression(returnStmt.Argument);
                    code.AppendLine($"return {returnCode};");
                }
                else
                {
                    code.AppendLine("return null;");
                }
                break;
            case EmptyStatement:
                // Empty statements (just semicolons) can be ignored
                break;
            default:
                throw new NotSupportedException($"Statement type {statement.Type} not supported for C# conversion");
        }
    }

    private void ConvertExpressionStatement(ExpressionStatement exprStmt, IndentedStringBuilder code)
    {
        // Expression statements are typically assignments like: ikkeFordelt = 100 - (tall1 + tall2 + tall3);
        if (exprStmt.Expression is AssignmentExpression assignment)
        {
            ConvertAssignmentExpression(assignment, code);
            return;
        }

        // Handle forEach calls
        if (exprStmt.Expression is CallExpression call)
        {
            ConvertCallExpressionStatement(call, code);
            return;
        }

        // Handle standalone conditional expressions that don't assign to anything
        // These are typically side-effect-free expressions like: obj.prodVareMat ? obj.prodVareMat : 0;
        // In JavaScript, these don't do anything useful, so we can safely skip them
        if (exprStmt.Expression is ConditionalExpression)
        {
            // Skip these no-op expressions
            return;
        }

        throw new NotSupportedException($"Expression statement pattern not supported");
    }

    private void ConvertCallExpressionStatement(CallExpression call, IndentedStringBuilder code)
    {
        // Handle forEach method calls
        if (call.Callee is MemberExpression member && member.Property is Identifier methodName)
        {
            if (methodName.Name == "forEach")
            {
                // Convert array.forEach(callback) to foreach loop
                ConvertForEachToForeach(member.Object, call, code);
                return;
            }
        }

        throw new NotSupportedException($"Call expression statement not supported");
    }

    private void ConvertForEachToForeach(Expression arrayExpr, CallExpression forEachCall, IndentedStringBuilder code)
    {
        // Expects: array.forEach(item => { ... })
        if (forEachCall.Arguments.Count == 0)
        {
            throw new NotSupportedException("forEach requires a callback function");
        }

        var callback = forEachCall.Arguments[0];

        // Extract the parameter name and body from the arrow function
        string paramName;
        Statement[]? bodyStatements = null;
        Expression? bodyExpression = null;

        if (callback is ArrowFunctionExpression arrow)
        {
            if (arrow.Params.Count != 1 || arrow.Params[0] is not Identifier param)
            {
                throw new NotSupportedException("forEach callback must have exactly one parameter");
            }
            paramName = param.Name;

            if (arrow.Body is BlockStatement blockBody)
            {
                bodyStatements = blockBody.Body.ToArray();
            }
            else if (arrow.Body is Expression expr)
            {
                bodyExpression = expr;
            }
            else
            {
                throw new NotSupportedException("forEach callback body not supported");
            }
        }
        else
        {
            throw new NotSupportedException("forEach callback must be an arrow function");
        }

        // Track the parameter as a local variable
        _localVariables[paramName] = paramName;

        // Convert the array expression
        var arrayCode = ConvertExpression(arrayExpr);

        // Generate the foreach loop
        code.AppendLine($"foreach (var {paramName} in {arrayCode})");
        code.OpenBrace();

        if (bodyStatements != null)
        {
            // Convert each statement in the block
            foreach (var stmt in bodyStatements)
            {
                ConvertStatementWithIndent(stmt, code);
            }
        }
        else if (bodyExpression != null)
        {
            // Convert single expression
            var exprCode = ConvertExpression(bodyExpression);
            code.AppendLine($"{exprCode};");
        }

        code.CloseBrace();

        // Remove the parameter from local variables after the loop
        _localVariables.Remove(paramName);
    }

    private void ConvertVariableDeclaration(VariableDeclaration varDecl, IndentedStringBuilder code)
    {
        foreach (var declarator in varDecl.Declarations)
        {
            if (declarator.Id is Identifier identifier)
            {
                var varName = identifier.Name;
                _localVariables[varName] = varName; // Track local variable

                if (declarator.Init != null)
                {
                    var initCode = ConvertExpression(declarator.Init);
                    code.AppendLine($"var {varName} = {initCode};");
                }
                else
                {
                    code.AppendLine($"var {varName};");
                }
            }
        }
    }

    private void ConvertIfStatement(IfStatement ifStmt, IndentedStringBuilder code)
    {
        var condition = ConvertExpression(ifStmt.Test);
        code.AppendLine($"if ({condition})");
        code.OpenBrace();

        // Convert the consequent (then branch)
        if (ifStmt.Consequent is BlockStatement block)
        {
            foreach (var stmt in block.Body)
            {
                ConvertStatementWithIndent(stmt, code);
            }
        }
        else
        {
            ConvertStatementWithIndent(ifStmt.Consequent, code);
        }

        code.CloseBrace();

        // Handle else clause if present
        if (ifStmt.Alternate != null)
        {
            if (ifStmt.Alternate is IfStatement elseIf)
            {
                // Handle else if - write it on the same indentation level
                code.Append("else ");
                var elseIfCondition = ConvertExpression(elseIf.Test);
                code.AppendLine($"if ({elseIfCondition})");
                code.OpenBrace();

                if (elseIf.Consequent is BlockStatement elseIfBlock)
                {
                    foreach (var stmt in elseIfBlock.Body)
                    {
                        ConvertStatementWithIndent(stmt, code);
                    }
                }
                else
                {
                    ConvertStatementWithIndent(elseIf.Consequent, code);
                }

                code.CloseBrace();

                // Handle any further else/else if
                if (elseIf.Alternate != null)
                {
                    // Temporarily create an if statement for recursion
                    var tempIf = new IfStatement(elseIf.Test, elseIf.Consequent, elseIf.Alternate);
                    // Manually handle the alternate without the initial if
                    if (elseIf.Alternate is IfStatement furtherElseIf)
                    {
                        code.Append("else ");
                        ConvertElseIfChain(furtherElseIf, code);
                    }
                    else
                    {
                        code.AppendLine("else");
                        code.OpenBrace();
                        if (elseIf.Alternate is BlockStatement finalElseBlock)
                        {
                            foreach (var stmt in finalElseBlock.Body)
                            {
                                ConvertStatementWithIndent(stmt, code);
                            }
                        }
                        else
                        {
                            ConvertStatementWithIndent(elseIf.Alternate, code);
                        }
                        code.CloseBrace();
                    }
                }
            }
            else
            {
                code.AppendLine("else");
                code.OpenBrace();

                if (ifStmt.Alternate is BlockStatement elseBlock)
                {
                    foreach (var stmt in elseBlock.Body)
                    {
                        ConvertStatementWithIndent(stmt, code);
                    }
                }
                else
                {
                    ConvertStatementWithIndent(ifStmt.Alternate, code);
                }

                code.CloseBrace();
            }
        }
    }

    private void ConvertElseIfChain(IfStatement elseIf, IndentedStringBuilder code)
    {
        var condition = ConvertExpression(elseIf.Test);
        code.AppendLine($"if ({condition})");
        code.OpenBrace();

        if (elseIf.Consequent is BlockStatement block)
        {
            foreach (var stmt in block.Body)
            {
                ConvertStatementWithIndent(stmt, code);
            }
        }
        else
        {
            ConvertStatementWithIndent(elseIf.Consequent, code);
        }

        code.CloseBrace();

        if (elseIf.Alternate != null)
        {
            if (elseIf.Alternate is IfStatement furtherElseIf)
            {
                code.Append("else ");
                ConvertElseIfChain(furtherElseIf, code);
            }
            else
            {
                code.AppendLine("else");
                code.OpenBrace();
                if (elseIf.Alternate is BlockStatement elseBlock)
                {
                    foreach (var stmt in elseBlock.Body)
                    {
                        ConvertStatementWithIndent(stmt, code);
                    }
                }
                else
                {
                    ConvertStatementWithIndent(elseIf.Alternate, code);
                }
                code.CloseBrace();
            }
        }
    }

    private void ConvertAssignmentExpression(AssignmentExpression assignment, IndentedStringBuilder code)
    {
        var operatorStr = assignment.Operator.ToString();

        if (assignment.Left is Identifier identifier)
        {
            var varName = identifier.Name;
            var rightCode = ConvertExpression(assignment.Right);

            // Check if this is a compound assignment (+=, -=, *=, /=, etc.) or simple assignment (=)
            if (operatorStr == "Assign" || operatorStr == "Assignment" || operatorStr == "=")
            {
                // Simple assignment - check if variable already exists
                if (_localVariables.ContainsKey(varName))
                {
                    // Variable already declared, just assign
                    code.AppendLine($"{varName} = {rightCode};");
                }
                else
                {
                    // New variable declaration
                    _localVariables[varName] = varName;
                    code.AppendLine($"var {varName} = {rightCode};");
                }
            }
            else
            {
                // Compound assignment (+=, -=, etc.)
                var op = operatorStr switch
                {
                    "AdditionAssignment" or "PlusAssignment" or "PlusAssign" or "+=" => "+=",
                    "SubtractionAssignment" or "MinusAssignment" or "MinusAssign" or "-=" => "-=",
                    "MultiplicationAssignment" or "TimesAssignment" or "TimesAssign" or "*=" => "*=",
                    "DivisionAssignment" or "DivideAssignment" or "DivideAssign" or "/=" => "/=",
                    "RemainderAssignment" or "ModuloAssignment" or "ModuloAssign" or "%=" => "%=",
                    _ => throw new NotSupportedException($"Assignment operator {operatorStr} not supported"),
                };
                code.AppendLine($"{varName} {op} {rightCode};");
            }
            return;
        }

        // Handle member expression assignments like obj.property = value
        if (assignment.Left is MemberExpression memberExpr)
        {
            var leftSide = ConvertMemberExpression(memberExpr);
            var rightCode = ConvertExpression(assignment.Right);

            // Check if this is a compound assignment or simple assignment
            if (operatorStr == "Assign" || operatorStr == "Assignment" || operatorStr == "=")
            {
                code.AppendLine($"{leftSide} = {rightCode};");
            }
            else
            {
                var op = operatorStr switch
                {
                    "AdditionAssignment" or "PlusAssignment" or "PlusAssign" or "+=" => "+=",
                    "SubtractionAssignment" or "MinusAssignment" or "MinusAssign" or "-=" => "-=",
                    "MultiplicationAssignment" or "TimesAssignment" or "TimesAssign" or "*=" => "*=",
                    "DivisionAssignment" or "DivideAssignment" or "DivideAssign" or "/=" => "/=",
                    "RemainderAssignment" or "ModuloAssignment" or "ModuloAssign" or "%=" => "%=",
                    _ => throw new NotSupportedException($"Assignment operator {operatorStr} not supported"),
                };
                code.AppendLine($"{leftSide} {op} {rightCode};");
            }
            return;
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
        // Extract the pattern and flags from the regex literal
        // The Raw property contains the full regex literal like "/^\d+$/i"
        var raw = regex.Raw ?? "";

        // Extract pattern between the first / and last /
        var lastSlash = raw.LastIndexOf('/');
        if (lastSlash <= 0)
        {
            throw new NotSupportedException($"Invalid regex literal: {raw}");
        }

        var pattern = raw.Substring(1, lastSlash - 1);
        var flags = lastSlash < raw.Length - 1 ? raw.Substring(lastSlash + 1) : "";

        // Escape quotes in the pattern for C# string
        var escapedPattern = pattern.Replace("\\", "\\\\").Replace("\"", "\\\"");

        // Convert flags to C# RegexOptions
        var options = new List<string>();
        if (flags.Contains('i'))
        {
            options.Add("System.Text.RegularExpressions.RegexOptions.IgnoreCase");
        }
        if (flags.Contains('m'))
        {
            options.Add("System.Text.RegularExpressions.RegexOptions.Multiline");
        }
        if (flags.Contains('s'))
        {
            options.Add("System.Text.RegularExpressions.RegexOptions.Singleline");
        }

        // Return the pattern as a string - the caller (test method) will use it with Regex.IsMatch
        return $"\"{escapedPattern}\"";
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
        // Handle computed member access: obj[key] or obj[expression]
        if (member.Computed)
        {
            var objCode = ConvertExpression(member.Object);
            var propertyCode = ConvertExpression(member.Property);

            // In C#, we need to use reflection or a dynamic approach for computed property access
            // For now, we'll assume the object is a Dictionary-like structure
            // This will need to be adjusted based on the actual data model structure
            return $"{objCode}[{propertyCode}]";
        }

        // Handle obj.property -> data.Property
        if (member.Object is Identifier objId && member.Property is Identifier propId)
        {
            var objectName = objId.Name;
            var propertyName = propId.Name;

            // Handle JavaScript Number constants
            if (objectName == "Number")
            {
                return propertyName switch
                {
                    "MAX_SAFE_INTEGER" => "9007199254740991", // 2^53 - 1
                    "MIN_SAFE_INTEGER" => "-9007199254740991", // -(2^53 - 1)
                    "MAX_VALUE" => "double.MaxValue",
                    "MIN_VALUE" => "double.Epsilon",
                    "POSITIVE_INFINITY" => "double.PositiveInfinity",
                    "NEGATIVE_INFINITY" => "double.NegativeInfinity",
                    "NaN" => "double.NaN",
                    _ => throw new NotSupportedException($"Number.{propertyName} not supported"),
                };
            }

            // Check if this property is a known input parameter
            if (_inputParams.ContainsKey(propertyName))
            {
                // Get the full data model path for this parameter
                var dataModelPath = _inputParams[propertyName];

                // Convert the path to C# property access
                var propertyPath = ExtractPropertyNameFromPath(dataModelPath);
                if (propertyPath != null)
                {
                    // Only add data variable name if it's not empty
                    return string.IsNullOrEmpty(_dataVariableName)
                        ? propertyPath
                        : $"{_dataVariableName}.{propertyPath}";
                }
            }

            // Check if the object is a local variable (like "obj" in helper functions)
            // If so, just return the property name as a local variable reference
            if (_localVariables.ContainsKey(objectName) || objectName == "obj")
            {
                // In helper functions with dictionary parameters, obj.property should be treated as a local variable
                return propertyName;
            }

            // Fallback: convert to Pascal case for C# property names
            // Only add data variable name if it's not empty
            var csharpPropertyName = ToPascalCase(propertyName);
            return string.IsNullOrEmpty(_dataVariableName)
                ? csharpPropertyName
                : $"{_dataVariableName}.{csharpPropertyName}";
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
            "UnaryNegation" or "BitwiseNot" or "~" => $"(~{argument})",
            _ => throw new NotSupportedException($"Unary operator '{operatorStr}' not supported"),
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
                        // When using null-conditional operator, Contains returns bool? which needs == true for logical operations
                        // For local variables that might be object?, we need to convert to string first
                        if (isLocalVariable)
                        {
                            // Local variable - check if it needs ToString() for object? type
                            return $"({obj}?.ToString()?.Contains({searchValue}) == true)";
                        }
                        else
                        {
                            return $"({obj}?.Contains({searchValue}) == true)";
                        }
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
                    // Note: toFixed in JS converts to string, but we'll use Math.Round for numeric result
                    if (call.Arguments.Count > 0)
                    {
                        var decimals = ConvertExpression(call.Arguments[0]);
                        // Don't add ?? 0 here as it may cause type conflicts when obj is already non-nullable
                        return $"Math.Round({obj}, {decimals})";
                    }
                    return $"Math.Round({obj}, 0)";

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
                    // forEach when used as an expression (not statement) is not supported
                    // It should be used as a statement instead
                    throw new NotSupportedException(
                        "forEach as an expression is not supported - it should be used as a statement"
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
