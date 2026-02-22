using System.Text;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.DataProcessingRules;

/// <summary>
/// Result of a C# code conversion
/// </summary>
internal sealed class CSharpConversionResult
{
    public bool Success { get; set; }
    public string? GeneratedCode { get; set; }
    public string? FailureReason { get; set; }
}

/// <summary>
/// Converts JavaScript statements and expressions to C# code
/// </summary>
internal sealed class StatementConverter
{
    private readonly Dictionary<string, string> _inputParams;
    private readonly string _dataVariableName;
    private readonly Dictionary<string, string> _localVariables = new();
    private readonly Dictionary<string, string> _localVariableTypes = new(); // actual C# type: "string?", "decimal?", "bool", etc.
    private int _tempVarCounter = 0;

    public StatementConverter(Dictionary<string, string> inputParams, string dataVariableName = "data")
    {
        _inputParams = inputParams;
        _dataVariableName = dataVariableName;
    }

    /// <summary>
    /// Mark variables as already declared to avoid redeclaration
    /// </summary>
    public void MarkVariablesAsDeclared(IEnumerable<string> variableNames)
    {
        foreach (var varName in variableNames)
        {
            _localVariables[varName] = varName;
        }
    }

    /// <summary>
    /// Mark a variable as declared with a specific type
    /// </summary>
    /// <param name="variableName">The variable name</param>
    /// <param name="typeName">The C# type name (e.g., "string?", "decimal?", "bool")</param>
    public void MarkVariableType(string variableName, string? typeName)
    {
        _localVariables[variableName] = variableName;
        if (typeName != null)
        {
            _localVariableTypes[variableName] = typeName;
        }
    }

    private bool IsStringType(string? typeName) => typeName != null && (typeName == "string" || typeName == "string?");

    private bool IsBoolType(string? typeName) => typeName != null && (typeName == "bool" || typeName == "bool?");

    private bool IsNumericType(string? typeName)
    {
        if (typeName == null)
            return false;
        return typeName == "decimal"
            || typeName == "decimal?"
            || typeName == "double"
            || typeName == "double?"
            || typeName == "int"
            || typeName == "int?";
    }

    private string? GetIdentifierType(Identifier id) =>
        _localVariableTypes.TryGetValue(id.Name, out var type) ? type : null;

    private string? GetMemberExpressionType(MemberExpression member)
    {
        if (member is { Object: Identifier, Property: Identifier propId })
            return _localVariableTypes.TryGetValue(propId.Name, out var type) ? type : null;
        return null;
    }

    private string? GetExpressionType(Expression expr)
    {
        return expr switch
        {
            Identifier id => GetIdentifierType(id),
            MemberExpression member => GetMemberExpressionType(member),
            Literal lit => lit.Value switch
            {
                string => "string?",
                bool => "bool",
                int or long or double or float => "decimal?",
                _ => null,
            },
            BinaryExpression or LogicalExpression => "bool",
            CallExpression call when IsCallExpressionReturningBoolean(call) => "bool",
            _ => null,
        };
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
        if (call.Callee is MemberExpression { Property: Identifier { Name: "forEach" } } member)
        {
            // Convert array.forEach(callback) to foreach loop
            ConvertForEachToForeach(member.Object, call, code);
            return;
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

                // Check if variable is already declared (e.g., as an input parameter)
                bool alreadyDeclared = _localVariables.ContainsKey(varName);

                if (declarator.Init != null)
                {
                    var initCode = ConvertExpression(declarator.Init);

                    // Use GetExpressionType to infer the correct type (handles bool, string, numeric)
                    var inferredType = GetExpressionType(declarator.Init);

                    // Fallback to legacy type detection if GetExpressionType returns null
                    if (inferredType == null)
                    {
                        inferredType = IsExpressionStringType(declarator.Init) ? "string?" : "decimal?";
                    }

                    _localVariableTypes[varName] = inferredType;

                    if (alreadyDeclared)
                    {
                        // Variable already exists (shadowing parameter) - use assignment instead of declaration
                        code.AppendLine($"{varName} = {initCode};");
                    }
                    else
                    {
                        // New variable - declare it
                        _localVariables[varName] = varName;
                        code.AppendLine($"var {varName} = {initCode};");
                    }
                }
                else
                {
                    if (!alreadyDeclared)
                    {
                        _localVariables[varName] = varName;
                        code.AppendLine($"var {varName};");
                        _localVariableTypes[varName] = "decimal?"; // Default to decimal
                    }
                    // If already declared and no initializer, skip entirely (no-op)
                }
            }
        }
    }

    private void ConvertIfStatement(IfStatement ifStmt, IndentedStringBuilder code)
    {
        var condition = ConvertExpression(ifStmt.Test);

        // In JavaScript, any value can be used as a condition (truthy/falsy)
        // In C#, we need an explicit boolean expression
        var conditionType = GetExpressionType(ifStmt.Test);
        if (IsBoolType(conditionType))
        {
            // Use as-is
        }
        else if (IsStringType(conditionType))
        {
            condition = $"!string.IsNullOrEmpty({condition})";
        }
        else if (IsNumericType(conditionType) || TestNeedsBooleanConversion(ifStmt.Test))
        {
            condition = $"{condition} != 0m";
        }

        // Scan for variables assigned in the if block that aren't already declared
        // These need to be hoisted to prevent scoping issues in C#
        var variablesToHoist = new HashSet<string>();
        var variableTypes = new Dictionary<string, string>(); // inferred types
        CollectAssignedVariables(ifStmt.Consequent, variablesToHoist, variableTypes);
        if (ifStmt.Alternate != null)
        {
            CollectAssignedVariables(ifStmt.Alternate, variablesToHoist, variableTypes);
        }

        // Declare variables that will be assigned in if/else blocks
        foreach (var varName in variablesToHoist.Where(v => !_localVariables.ContainsKey(v)))
        {
            // Determine the type based on the assignments
            var inferredType = variableTypes.TryGetValue(varName, out var type) ? type : "decimal?";
            var defaultValue = IsStringType(inferredType) ? "\"\"" : "0m";
            code.AppendLine($"var {varName} = {defaultValue};");
            _localVariables[varName] = varName; // Mark as declared
            _localVariableTypes[varName] = inferredType; // Track the type
        }

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

                // Apply boolean conversion if needed
                var elseIfConditionType = GetExpressionType(elseIf.Test);
                if (IsBoolType(elseIfConditionType))
                {
                    // Use as-is
                }
                else if (IsStringType(elseIfConditionType))
                {
                    elseIfCondition = $"!string.IsNullOrEmpty({elseIfCondition})";
                }
                else if (IsNumericType(elseIfConditionType) || TestNeedsBooleanConversion(elseIf.Test))
                {
                    elseIfCondition = $"{elseIfCondition} != 0m";
                }

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

    private void CollectAssignedVariables(
        Statement statement,
        HashSet<string> variables,
        Dictionary<string, string>? variableTypes = null
    )
    {
        // Recursively collect variable names that are assigned (but not declared) in a statement
        // variableTypes: if provided, tracks the inferred C# type for each variable
        switch (statement)
        {
            case ExpressionStatement exprStmt when exprStmt.Expression is AssignmentExpression assignment:
                if (assignment.Left is Identifier id && !_localVariables.ContainsKey(id.Name))
                {
                    variables.Add(id.Name);

                    // Determine the type from the assignment
                    if (variableTypes != null)
                    {
                        var inferredType = IsExpressionStringType(assignment.Right) ? "string?" : "decimal?";
                        // Prefer string type if any assignment is a string
                        // This handles cases like: x = ""; later x = someValue;
                        if (!variableTypes.ContainsKey(id.Name) || inferredType == "string?")
                        {
                            variableTypes[id.Name] = inferredType;
                        }
                    }
                }
                break;
            case BlockStatement block:
                foreach (var stmt in block.Body)
                {
                    CollectAssignedVariables(stmt, variables, variableTypes);
                }
                break;
            case IfStatement ifStmt:
                CollectAssignedVariables(ifStmt.Consequent, variables, variableTypes);
                if (ifStmt.Alternate != null)
                {
                    CollectAssignedVariables(ifStmt.Alternate, variables, variableTypes);
                }
                break;
        }
    }

    private bool IsExpressionStringType(Expression expr)
    {
        // Determine if an expression evaluates to a string
        return expr switch
        {
            Literal lit => lit.Value is string,
            TemplateLiteral => true,
            Identifier id => IsIdentifierStringType(id),
            MemberExpression member => IsMemberExpressionStringType(member),
            CallExpression call
                when call.Callee is MemberExpression member && member.Property is Identifier methodName =>
                methodName.Name is "toString" or "toUpperCase" or "toLowerCase" or "trim" or "split",
            CallExpression call when call.Callee is Identifier globalFunc => globalFunc.Name is "String",
            BinaryExpression binary when binary.Operator.ToString() is "Addition" or "+" =>
            // Only treat as string if BOTH sides are strings (not mixed string + number)
            IsExpressionStringType(binary.Left) && IsExpressionStringType(binary.Right),
            ConditionalExpression conditional =>
            // If either branch is a string, treat the whole ternary as string
            // This handles cases like: x ? x : "" or x ? "" : x
            IsExpressionStringType(conditional.Consequent) || IsExpressionStringType(conditional.Alternate),
            _ => false, // Default to number for other expressions
        };
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
                // Check if this is a self-assignment (e.g., tall1 = tall1)
                // These are no-ops generated from JS patterns like "tall1 = obj.tall1 ? +obj.tall1 : 0"
                // where the input param is already defaulted to 0 at declaration
                if (rightCode == varName)
                {
                    // Skip self-assignment - it's a no-op
                    return;
                }

                // Simple assignment - check if variable already exists
                if (_localVariables.ContainsKey(varName))
                {
                    // Variable already declared, just assign
                    code.AppendLine($"{varName} = {rightCode};");
                    // Update type if this is a string assignment
                    var inferredType = IsExpressionStringType(assignment.Right) ? "string?" : "decimal?";
                    _localVariableTypes[varName] = inferredType;
                }
                else
                {
                    // New variable declaration
                    _localVariables[varName] = varName;
                    var inferredType = IsExpressionStringType(assignment.Right) ? "string?" : "decimal?";
                    _localVariableTypes[varName] = inferredType;
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
            var rightCode = ConvertExpression(assignment.Right);
            var leftSide = ConvertMemberExpression(memberExpr);

            // Check if this is a compound assignment or simple assignment
            if (operatorStr == "Assign" || operatorStr == "Assignment" || operatorStr == "=")
            {
                // Check if this is a self-assignment (e.g., ansatte = ansatte)
                // Skip these no-op assignments
                if (leftSide == rightCode)
                {
                    // Skip self-assignment - it's a no-op
                    return;
                }

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
                ? $"\"{EscapeString(template.Quasis[0].Value.Cooked ?? "")}\""
                : "\"\"";
        }

        // Template literal with expressions - convert to string interpolation
        var result = new StringBuilder("$\"");
        for (int i = 0; i < template.Quasis.Count; i++)
        {
            if (template.Quasis[i].Value.Cooked != null)
            {
                result.Append(EscapeString(template.Quasis[i].Value.Cooked ?? ""));
            }

            if (i < template.Expressions.Count)
            {
                var expr = ConvertExpression(template.Expressions[i]);
                result.Append(System.Globalization.CultureInfo.InvariantCulture, $"{{{expr}}}");
            }
        }
        result.Append('"');
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
        else if (arrow.Body is BlockStatement)
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

        // Check if right side is a numeric literal
        var rightIsNumeric = binary.Right is Literal lit3 && (lit3.Value is int or long or double or float);
        // Check if left side is a numeric literal
        var leftIsNumeric = binary.Left is Literal lit4 && (lit4.Value is int or long or double or float);

        // Check if left or right is a local variable (not from wrapper.Get())
        var leftIsLocalVar = binary.Left is Identifier leftIdent && _localVariables.ContainsKey(leftIdent.Name);
        var rightIsLocalVar = binary.Right is Identifier rightIdent && _localVariables.ContainsKey(rightIdent.Name);

        // Comparison operations need type conversion: ==, !=
        var isComparisonOp = op is "==" or "!=";

        // If comparing a numeric literal with a local variable that is a string,
        // convert the numeric literal to string
        if (isComparisonOp && leftIsLocalVar && rightIsNumeric)
        {
            // Left is a local variable, right is numeric - convert right to string if left is string
            var leftIdForCheck = binary.Left.As<Identifier>();
            if (_localVariableTypes.TryGetValue(leftIdForCheck.Name, out var leftType) && IsStringType(leftType))
            {
                right = $"\"{binary.Right.As<Literal>().Value}\"";
            }
        }

        if (isComparisonOp && rightIsLocalVar && leftIsNumeric)
        {
            // Right is a local variable, left is numeric - convert left to string if right is string
            var rightIdForCheck = binary.Right.As<Identifier>();
            if (_localVariableTypes.TryGetValue(rightIdForCheck.Name, out var rightType) && IsStringType(rightType))
            {
                left = $"\"{binary.Left.As<Literal>().Value}\"";
            }
        }

        return $"{left} {op} {right}";
    }

    private string ConvertMemberExpression(MemberExpression member)
    {
        // Handle computed member access: obj[key] or obj[expression]
        if (member.Computed)
        {
            var objCode = ConvertExpression(member.Object);
            var propertyCode = ConvertExpression(member.Property);
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
                    "MAX_SAFE_INTEGER" => "9007199254740991", // 2^53 - 1, as double to avoid int overflow
                    "MIN_SAFE_INTEGER" => "-9007199254740991", // -(2^53 - 1), as double
                    "MAX_VALUE" => "double.MaxValue",
                    "MIN_VALUE" => "double.Epsilon",
                    "POSITIVE_INFINITY" => "double.PositiveInfinity",
                    "NEGATIVE_INFINITY" => "double.NegativeInfinity",
                    "NaN" => "double.NaN",
                    _ => throw new NotSupportedException($"Number.{propertyName} not supported"),
                };
            }

            // Check if this property is a known input parameter
            if (_inputParams.TryGetValue(propertyName, out var dataModelPath))
            {
                // Get the full data model path for this parameter

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
        if (_inputParams.TryGetValue(identifier.Name, out var dataModelPath))
        {
            // Get the full data model path for this parameter

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
            string str => ConvertStringLiteral(str),
            bool b => b ? "true" : "false",
            int or long or double or float => ConvertNumericLiteral(literal.Value),
            _ => literal.Raw ?? literal.Value.ToString() ?? "null",
        };
    }

    private string ConvertNumericLiteral(object value)
    {
        // Convert JavaScript numbers to C# decimals since many Altinn data models use decimal types
        // JavaScript doesn't distinguish between integer and floating-point numbers
        var doubleValue = Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);

        // Check if it's a whole number using tolerance-based comparison
        const double tolerance = 1e-10;
        if (Math.Abs(doubleValue % 1) < tolerance && !double.IsInfinity(doubleValue) && !double.IsNaN(doubleValue))
        {
            // For small whole numbers (1-20) that are commonly used as method parameters
            // (precision, count, index), use the integer form to avoid ambiguous overloads
            // But exclude 0 since it's often used as an accumulator initial value
            // Already checked that it's a whole number above, no need to check again
            if (doubleValue >= 1 && doubleValue <= 20)
            {
                return ((int)doubleValue).ToString(System.Globalization.CultureInfo.InvariantCulture);
            }

            // For large numbers that don't fit in int (> int.MaxValue), use decimal format with m suffix
            if (Math.Abs(doubleValue) > int.MaxValue)
            {
                return $"{doubleValue:0.0}m";
            }

            // For all other whole numbers (including 0), use decimal literal with m suffix
            // This avoids type conflicts when comparing with decimal? fields from data models
            return $"{doubleValue:0}m";
        }

        // For fractional numbers, use decimal format with m suffix
        return $"{doubleValue}m";
    }

    private string ConvertStringLiteral(string str)
    {
        // Always treat string literals as strings in C#
        // JavaScript's automatic type coercion between strings and numbers
        // doesn't translate directly to C#, so we preserve the string type
        return $"\"{EscapeString(str)}\"";
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
            && Math.Abs(Convert.ToDouble(literal.Value, System.Globalization.CultureInfo.InvariantCulture))
                < double.Epsilon
        )
        {
            // Just use the unary plus conversion directly, which already handles the fallback to 0
            return ConvertUnaryPlus(unary.Argument);
        }

        var test = ConvertExpression(conditional.Test);
        var consequent = ConvertExpression(conditional.Consequent);
        var alternate = ConvertExpression(conditional.Alternate);

        // Check if this is a mixed-type ternary (one branch is string, the other is not)
        var consequentIsString = IsExpressionStringType(conditional.Consequent);
        var alternateIsString = IsExpressionStringType(conditional.Alternate);

        // If one branch is string and the other is not, convert the non-string branch to string
        if (consequentIsString && !alternateIsString)
        {
            // Consequent is string, alternate is not - convert alternate to string
            if (!alternate.Trim().StartsWith('"'))
            {
                // It's not already a string literal
                // Check if this is a simple identifier or member expression that could be null
                if (conditional.Alternate is Identifier || conditional.Alternate is MemberExpression)
                {
                    // For identifiers and member expressions, use null-conditional operator
                    alternate = $"({alternate}?.ToString() ?? \"\")";
                }
                else
                {
                    // For complex expressions (binary operations, etc.), the result is a value type
                    // that can't be null, so just call ToString() without ?.
                    alternate = $"({alternate}).ToString()";
                }
            }
        }
        else if (!consequentIsString && alternateIsString)
        {
            // Alternate is string, consequent is not - convert consequent to string
            if (
                !consequent.Trim().StartsWith('"')
                && (conditional.Consequent is Identifier || conditional.Consequent is MemberExpression)
            )
            {
                // For identifiers and member expressions that are not already string literals,
                // use null-conditional operator
                consequent = $"({consequent}?.ToString() ?? \"\")";
            }
            else if (!consequent.Trim().StartsWith('"'))
            {
                // For complex expressions (binary operations, etc.), the result is a value type
                // that can't be null, so just call ToString() without ?.
                consequent = $"({consequent}).ToString()";
            }
        }

        // In JavaScript, any value can be used as a condition (truthy/falsy)
        // In C#, we need an explicit boolean expression
        var testType = GetExpressionType(conditional.Test);
        if (IsBoolType(testType))
        {
            // Already boolean, use as-is
        }
        else if (IsStringType(testType))
        {
            test = $"!string.IsNullOrEmpty({test})";
        }
        else if (IsNumericType(testType) || TestNeedsBooleanConversion(conditional.Test))
        {
            test = $"{test} != 0m";
        }

        // Handle nullable ternary operator - in JS, numbers can be null/undefined
        // but in C#, we can't use ? on non-nullable types like double
        // If consequent or alternate contains numeric operations that result in double,
        // the ternary operator itself should work with doubles (not double?)
        // The issue arises when we try to apply ? operator to a double literal or expression

        // Check if this is a pattern like: something ? 123.0 : 0.0
        // In this case, both branches are non-nullable doubles, so the result is double (not double?)
        // No special handling needed - C# will infer the correct type

        return $"{test} ? {consequent} : {alternate}";
    }

    private bool TestNeedsBooleanConversion(Expression expr)
    {
        // Check if the expression is numeric and needs != 0m check
        return expr switch
        {
            Identifier id => GetIdentifierType(id) is string type && IsNumericType(type),
            UnaryExpression unary => unary.Operator.ToString() == "UnaryPlus",
            MemberExpression member => GetMemberExpressionType(member) is string type && IsNumericType(type),
            CallExpression call => !IsCallExpressionReturningBoolean(call),
            Literal lit => lit.Value is int or long or double or float,
            _ => false,
        };
    }

    private bool IsIdentifierStringType(Identifier id)
    {
        // Check if this identifier is a known string-typed local variable
        if (_localVariableTypes.TryGetValue(id.Name, out var type))
        {
            return IsStringType(type);
        }
        return false;
    }

    private bool IsMemberExpressionStringType(MemberExpression member)
    {
        // Check if this member expression refers to a string-typed property
        // For obj.property patterns where property is a local variable
        if (
            member is { Object: Identifier, Property: Identifier propId }
            && _localVariableTypes.TryGetValue(propId.Name, out var type)
        )
        {
            return IsStringType(type);
        }
        return false;
    }

    private bool IsCallExpressionReturningBoolean(CallExpression call)
    {
        // Check if this is a call expression that returns boolean
        // These should NOT be converted with != 0
        if (call.Callee is Identifier globalFunc)
        {
            return globalFunc.Name is "isNaN" or "isFinite";
        }

        if (call.Callee is MemberExpression member && member.Property is Identifier methodName)
        {
            // Methods that return boolean
            return methodName.Name is "includes" or "test";
        }

        return false;
    }

    private string ConvertUnaryExpression(UnaryExpression unary)
    {
        var argument = ConvertExpression(unary.Argument);
        var operatorStr = unary.Operator.ToString();

        return operatorStr switch
        {
            "LogicalNot" or "!" => $"(!{argument})",
            "UnaryPlus" or "Plus" or "+" => ConvertUnaryPlus(unary.Argument),
            "UnaryMinus" or "Minus" or "-" or "UnaryNegation" => $"(-{argument})", // UnaryNegation is also unary minus
            "BitwiseNot" or "~" => ConvertBitwiseNot(argument), // Handle bitwise NOT
            _ => throw new NotSupportedException($"Unary operator '{operatorStr}' not supported"),
        };
    }

    private string ConvertBitwiseNot(string argument)
    {
        // Bitwise NOT in JavaScript: ~x
        // In C#, we need to cast to int, but some values like Number.MAX_SAFE_INTEGER are too large for int
        // Check if the argument is a large number that won't fit in int
        var argTrimmed = argument.Trim();

        // Check if this is Number.MAX_SAFE_INTEGER or other large constant
        if (double.TryParse(argTrimmed, out double numValue) && Math.Abs(numValue) > int.MaxValue)
        {
            // For large numbers, we can't use bitwise NOT with int cast
            // JavaScript ~9007199254740991 would be -9007199254740992
            // We'll use long instead, or just negate and subtract 1
            return $"(~(long){argument})";
        }

        // For normal-sized numbers, cast to int
        return $"(~(int){argument})";
    }

    private string ConvertUnaryPlus(Expression argument)
    {
        // In JavaScript, +expr coerces to number
        var expr = ConvertExpression(argument);
        var exprType = GetExpressionType(argument);

        // If already numeric, use as-is
        if (IsNumericType(exprType))
        {
            return expr;
        }

        // If string, need conversion with TryParse
        if (IsStringType(exprType))
        {
            var tempVar = $"_temp{_tempVarCounter++}";
            return $"(decimal.TryParse({expr}, out var {tempVar}) ? {tempVar} : 0m)";
        }

        // Unknown type, use safe conversion with ToString
        var tempVar2 = $"_temp{_tempVarCounter++}";
        return $"(decimal.TryParse({expr}?.ToString() ?? \"\", out var {tempVar2}) ? {tempVar2} : 0m)";
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
            "NullishCoalescing" or "??" => HandleNullishCoalescing(logical, left, right),
            _ => throw new NotSupportedException($"Logical operator {operatorStr} not supported"),
        };

        // If HandleNullishCoalescing returned a full expression, return it directly
        if (operatorStr is "NullishCoalescing" or "??")
        {
            return op;
        }

        // For && and || operators, we need to ensure both sides are boolean expressions
        // In JavaScript, any value can be used in logical operations (truthy/falsy)
        // In C#, we need explicit boolean conversions
        if (op is "&&" or "||")
        {
            // Check if left side needs boolean conversion
            if (
                TestNeedsBooleanConversion(logical.Left)
                && logical.Left is not BinaryExpression
                && logical.Left is not LogicalExpression
            )
            {
                // For other numeric expressions, add != 0 check
                left = $"({left} != 0m)";
            }

            // Check if right side needs boolean conversion
            if (
                TestNeedsBooleanConversion(logical.Right)
                && logical.Right is not BinaryExpression
                && logical.Right is not LogicalExpression
            )
            {
                // For other numeric expressions, add != 0 check
                right = $"({right} != 0m)";
            }
        }

        return $"{left} {op} {right}";
    }

    private string HandleNullishCoalescing(LogicalExpression logical, string left, string right)
    {
        // In JavaScript, ?? checks for null/undefined
        // For non-nullable numeric types in C#, this translates to checking for 0 (falsy)
        // e.g., a ?? b becomes (a != 0 ? a : b)

        // Check if both operands are likely numeric (non-nullable)
        bool leftIsNumeric = TestNeedsBooleanConversion(logical.Left);
        bool rightIsNumeric = TestNeedsBooleanConversion(logical.Right);

        if (leftIsNumeric && rightIsNumeric)
        {
            // Convert a ?? b to (a != 0 ? a : b)
            return $"(({left} != 0) ? {left} : {right})";
        }

        // For other cases, use standard ?? operator
        return $"({left} ?? {right})";
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
                        // Use decimal.Parse to match Altinn data model types
                        // If the type doesn't match, we want a compile error
                        return $"decimal.Parse({value})";
                    }
                    throw new NotSupportedException("parseFloat requires an argument");

                case "isNaN":
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        // isNaN returns bool in C#, not a number
                        return $"double.IsNaN({value})";
                    }
                    throw new NotSupportedException("isNaN requires an argument");

                case "isFinite":
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        // isFinite returns bool in C#, not a number
                        return $"(!double.IsInfinity({value}) && !double.IsNaN({value}))";
                    }
                    throw new NotSupportedException("isFinite requires an argument");

                case "Number":
                    // Number(x) converts to number, similar to parseFloat but handles more cases
                    if (call.Arguments.Count > 0)
                    {
                        var value = ConvertExpression(call.Arguments[0]);
                        // Use double.Parse to get compile-time type checking
                        return $"double.Parse({value})";
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
                    // Check if obj is a complex expression (contains operators) that results in a value type
                    // If so, we can't use ?. operator and should just call .ToString() directly
                    var objIsComplexExpression =
                        obj.Contains('+')
                        || obj.Contains('-')
                        || obj.Contains('*')
                        || obj.Contains('/')
                        || obj.Contains('(')
                        || obj.Contains('?'); // Ternary operator

                    // Also check if the member.Object is a value-type expression (ternary, arithmetic, etc.)
                    var memberObjIsValueType = member.Object switch
                    {
                        ConditionalExpression => true, // Ternary expressions that return doubles
                        BinaryExpression => true, // Arithmetic operations
                        UnaryExpression => true, // Unary operations like +, -
                        CallExpression callExpr
                            when callExpr.Callee is MemberExpression callMember
                                && callMember.Property is Identifier callMethodName
                                && callMethodName.Name is "round" or "toFixed" => true, // Math operations
                        _ => false,
                    };

                    // Check for value types FIRST, before applying nullable operators
                    if (objIsComplexExpression || memberObjIsValueType)
                    {
                        // For complex expressions that result in value types (like arithmetic), just call .ToString()
                        return $"({obj}).ToString()";
                    }

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
                        // In C#, Split() requires a char, char[], or string[] (not int/double or string)
                        // Check if separator is a numeric literal and convert to char
                        // Handle both integer and double formats (10, 10.0)
                        var separatorTrimmed = separator.Trim();
                        if (double.TryParse(separatorTrimmed, out double numValue))
                        {
                            int charCode = (int)numValue;
                            if (charCode >= 0 && charCode <= 127)
                            {
                                // Convert ASCII code to character
                                separator = $"(char){charCode}";
                            }
                        }
                        // Check if separator is a single-character string literal like "," or "\n"
                        // and convert to char array for C# compatibility
                        else if (separatorTrimmed.StartsWith('"') && separatorTrimmed.EndsWith('"'))
                        {
                            var stringContent = separatorTrimmed.Substring(1, separatorTrimmed.Length - 2);
                            // Handle escape sequences
                            stringContent = stringContent
                                .Replace("\\n", "\n")
                                .Replace("\\r", "\r")
                                .Replace("\\t", "\t")
                                .Replace("\\\\", "\\");

                            if (stringContent.Length == 1)
                            {
                                // Single character - use char array for Split (required in some .NET versions with nullable)
                                separator = $"new[] {{ '{stringContent}' }}";
                            }
                        }

                        // In .NET 6+, Split with char[] on nullable string requires StringSplitOptions
                        if (nullConditional == "?" && separator.StartsWith("new[] {", StringComparison.Ordinal))
                        {
                            return $"{obj}{nullConditional}.Split({separator}, StringSplitOptions.None)";
                        }
                        return $"{obj}{nullConditional}.Split({separator})";
                    }
                    // Split() with no arguments is not valid in C# - use default whitespace split
                    return $"{obj}{nullConditional}.Split(new[] {{ ' ', '\\t', '\\n', '\\r' }}, StringSplitOptions.RemoveEmptyEntries)";

                case "includes":
                    // Handle includes (Contains in C#)
                    if (call.Arguments.Count > 0)
                    {
                        var searchValue = ConvertExpression(call.Arguments[0]);

                        // Check if searchValue is a numeric literal - if so, convert to string
                        // In JavaScript, array.includes(0) checks if 0 is in the array
                        // In C# string.Contains, we need to convert numeric args to strings
                        var searchValueTrimmed = searchValue.Trim();
                        if (double.TryParse(searchValueTrimmed, out double _))
                        {
                            // It's a numeric literal - wrap in ToString() for string Contains
                            // or convert to char for single digit
                            int intValue = (int)
                                double.Parse(searchValueTrimmed, System.Globalization.CultureInfo.InvariantCulture);
                            if (intValue >= 0 && intValue <= 9)
                            {
                                // Single digit - can be used as char
                                searchValue = $"'{intValue}'";
                            }
                            else
                            {
                                // Multi-digit or non-char - convert to string
                                searchValue = $"\"{intValue}\"";
                            }
                        }

                        // When using null-conditional operator, Contains returns bool? which needs == true for logical operations
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
                    // Use double.Parse to get compile-time type checking
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
        return char.ToUpper(input[0], System.Globalization.CultureInfo.InvariantCulture) + input[1..];
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
