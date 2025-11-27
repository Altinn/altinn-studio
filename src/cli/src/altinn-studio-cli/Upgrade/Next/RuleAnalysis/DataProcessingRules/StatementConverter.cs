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
    private readonly bool _useFormDataWrapper;
    private readonly Dictionary<string, string> _localVariables = new();
    private readonly Dictionary<string, bool> _localVariableTypes = new(); // true = string, false = double
    private int _tempVarCounter = 0;

    public StatementConverter(
        Dictionary<string, string> inputParams,
        string dataVariableName = "data",
        bool useFormDataWrapper = false
    )
    {
        _inputParams = inputParams;
        _dataVariableName = dataVariableName;
        _useFormDataWrapper = useFormDataWrapper;
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
    /// <param name="isString">True if the variable is a string type, false if numeric</param>
    public void MarkVariableType(string variableName, bool isString)
    {
        _localVariables[variableName] = variableName;
        _localVariableTypes[variableName] = isString;
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
                    // Detect if this is a string type initialization
                    var isString = IsExpressionStringType(declarator.Init);
                    _localVariableTypes[varName] = isString;
                    code.AppendLine($"var {varName} = {initCode};");
                }
                else
                {
                    code.AppendLine($"var {varName};");
                    _localVariableTypes[varName] = false; // Default to double
                }
            }
        }
    }

    private void ConvertIfStatement(IfStatement ifStmt, IndentedStringBuilder code)
    {
        var condition = ConvertExpression(ifStmt.Test);

        // In JavaScript, any value can be used as a condition (truthy/falsy)
        // In C#, we need an explicit boolean expression
        if (TestNeedsBooleanConversion(ifStmt.Test))
        {
            // Don't wrap wrapper.Get() with Convert.ToDecimal - let it fail at compile time if types don't match
            condition = $"({condition} != 0m)";
        }

        // Scan for variables assigned in the if block that aren't already declared
        // These need to be hoisted to prevent scoping issues in C#
        var variablesToHoist = new HashSet<string>();
        var variableTypes = new Dictionary<string, bool>(); // true = string, false = double
        CollectAssignedVariables(ifStmt.Consequent, variablesToHoist, variableTypes);
        if (ifStmt.Alternate != null)
        {
            CollectAssignedVariables(ifStmt.Alternate, variablesToHoist, variableTypes);
        }

        // Declare variables that will be assigned in if/else blocks
        foreach (var varName in variablesToHoist.Where(v => !_localVariables.ContainsKey(v)))
        {
            // Determine the type based on the assignments
            var isString = variableTypes.TryGetValue(varName, out var type) && type;
            code.AppendLine(isString ? $"var {varName} = \"\";" : $"var {varName} = 0m;");
            _localVariables[varName] = varName; // Mark as declared
            _localVariableTypes[varName] = isString; // Track the type
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
                if (TestNeedsBooleanConversion(elseIf.Test))
                {
                    // Don't wrap wrapper.Get() with Convert.ToDecimal - let it fail at compile time if types don't match
                    elseIfCondition = $"({elseIfCondition} != 0m)";
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

    private void CollectAssignedVariables(
        Statement statement,
        HashSet<string> variables,
        Dictionary<string, bool>? variableTypes = null
    )
    {
        // Recursively collect variable names that are assigned (but not declared) in a statement
        // variableTypes: if provided, tracks whether variables are strings (true) or numbers (false)
        switch (statement)
        {
            case ExpressionStatement exprStmt when exprStmt.Expression is AssignmentExpression assignment:
                if (assignment.Left is Identifier id && !_localVariables.ContainsKey(id.Name))
                {
                    variables.Add(id.Name);

                    // Determine if this assignment is to a string or number
                    if (variableTypes != null)
                    {
                        var isString = IsExpressionStringType(assignment.Right);
                        // Use an OR approach: if ANY assignment is a string, treat the variable as string
                        // This handles cases like: x = ""; later x = someValue;
                        if (variableTypes.TryGetValue(id.Name, out var existingType))
                        {
                            // If existing is true (string) OR this assignment is true (string), it's a string
                            variableTypes[id.Name] = existingType || isString;
                        }
                        else
                        {
                            variableTypes[id.Name] = isString;
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
                    var isString = IsExpressionStringType(assignment.Right);
                    _localVariableTypes[varName] = isString;
                }
                else
                {
                    // New variable declaration
                    _localVariables[varName] = varName;
                    var isString = IsExpressionStringType(assignment.Right);
                    _localVariableTypes[varName] = isString;
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

            // Check if this is an assignment to a data model property (when using FormDataWrapper)
            if (
                _useFormDataWrapper
                && memberExpr.Object is Identifier objId
                && memberExpr.Property is Identifier propId
            )
            {
                var propertyName = propId.Name;

                // Check if this property is a known input parameter (which means it's a data model path)
                if (_inputParams.ContainsKey(propertyName))
                {
                    var dataModelPath = _inputParams[propertyName];

                    // Check if this is a compound assignment or simple assignment
                    if (operatorStr == "Assign" || operatorStr == "Assignment" || operatorStr == "=")
                    {
                        code.AppendLine($"{_dataVariableName}.Set(\"{dataModelPath}\", {rightCode});");
                    }
                    else
                    {
                        // For compound assignments, we need to get the current value first
                        var op = operatorStr switch
                        {
                            "AdditionAssignment" or "PlusAssignment" or "PlusAssign" or "+=" => "+",
                            "SubtractionAssignment" or "MinusAssignment" or "MinusAssign" or "-=" => "-",
                            "MultiplicationAssignment" or "TimesAssignment" or "TimesAssign" or "*=" => "*",
                            "DivisionAssignment" or "DivideAssignment" or "DivideAssign" or "/=" => "/",
                            "RemainderAssignment" or "ModuloAssignment" or "ModuloAssign" or "%=" => "%",
                            _ => throw new NotSupportedException($"Assignment operator {operatorStr} not supported"),
                        };
                        code.AppendLine(
                            $"{_dataVariableName}.Set(\"{dataModelPath}\", {_dataVariableName}.Get(\"{dataModelPath}\") {op} {rightCode});"
                        );
                    }
                    return;
                }
                else
                {
                    // Property is not in input params - this might be an error in the rule configuration
                    // Skip this assignment and add a comment
                    code.AppendLine(
                        $"// Warning: Property '{propertyName}' not found in input parameters - skipping assignment"
                    );
                    return;
                }
            }

            // Fallback to standard property access
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

        // Handle FormDataWrapper type conversions
        if (_useFormDataWrapper)
        {
            var leftIsWrapper = left.Contains("wrapper.Get(");
            var rightIsWrapper = right.Contains("wrapper.Get(");

            // Don't add Convert.ToDouble() around wrapper.Get() calls
            // wrapper.Get() returns the actual type from the data model, so we want compile errors if types don't match
            // Only handle string concatenation special case
            if (op == "+")
            {
                var leftIsString = binary.Left is Literal lit1 && lit1.Value is string;
                var rightIsString = binary.Right is Literal lit2 && lit2.Value is string;

                // If one side is wrapper.Get() and the other is a string literal, cast wrapper.Get() to string
                if ((leftIsWrapper && rightIsString) || (rightIsWrapper && leftIsString))
                {
                    if (leftIsWrapper)
                    {
                        left = $"({left} as string)";
                    }
                    if (rightIsWrapper)
                    {
                        right = $"({right} as string)";
                    }
                }
            }
        }

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
            if (_localVariableTypes.TryGetValue(leftIdForCheck.Name, out var leftIsString) && leftIsString)
            {
                right = $"\"{binary.Right.As<Literal>().Value}\"";
            }
        }

        if (isComparisonOp && rightIsLocalVar && leftIsNumeric)
        {
            // Right is a local variable, left is numeric - convert left to string if right is string
            var rightIdForCheck = binary.Right.As<Identifier>();
            if (_localVariableTypes.TryGetValue(rightIdForCheck.Name, out var rightIsString) && rightIsString)
            {
                left = $"\"{binary.Left.As<Literal>().Value}\"";
            }
        }

        return $"({left} {op} {right})";
    }

    private string ConvertMemberExpression(MemberExpression member)
    {
        // Handle computed member access: obj[key] or obj[expression]
        if (member.Computed)
        {
            var objCode = ConvertExpression(member.Object);
            var propertyCode = ConvertExpression(member.Property);

            // Check if this is accessing a FormDataWrapper-based object with computed property
            // When using FormDataWrapper, obj[key] should use wrapper.Get() with dynamic path
            if (_useFormDataWrapper && member.Object is Identifier computedObjId)
            {
                // If the object is from input params (not a local variable like loop iterators),
                // we need to use wrapper.Get() with a dynamic path
                var isLocalVariable = _localVariables.ContainsKey(computedObjId.Name);

                if (!isLocalVariable)
                {
                    // This is likely a reference to the data model
                    // For computed property access, we use wrapper.Get() with string interpolation
                    // Example: obj[key] becomes wrapper.Get($"SkjemaData.{key}")

                    // Try to find a base path from input params
                    string basePath = "SkjemaData"; // Default base path

                    // Look through input params to find a common base path
                    if (_inputParams.Count > 0)
                    {
                        var firstPath = _inputParams.First().Value;
                        var pathParts = firstPath.Split('.');
                        if (pathParts.Length > 0)
                        {
                            basePath = pathParts[0]; // Use the first part as base (typically "SkjemaData")
                        }
                    }

                    // Use wrapper.Get() with dynamic path
                    return $"{_dataVariableName}.Get($\"{basePath}.{{{propertyCode}}}\")";
                }
            }

            // For non-wrapper contexts or local variables, use dictionary-style access
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
            if (_inputParams.ContainsKey(propertyName))
            {
                // Get the full data model path for this parameter
                var dataModelPath = _inputParams[propertyName];

                if (_useFormDataWrapper)
                {
                    // Use FormDataWrapper.Get() with the original JS path
                    return $"{_dataVariableName}.Get(\"{dataModelPath}\")";
                }
                else
                {
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

            if (_useFormDataWrapper)
            {
                // Use FormDataWrapper.Get() with the original JS path
                return $"{_dataVariableName}.Get(\"{dataModelPath}\")";
            }
            else
            {
                // Convert the path to C# property access
                var propertyPath = ExtractPropertyNameFromPath(dataModelPath);
                if (propertyPath != null)
                {
                    return $"{_dataVariableName}.{propertyPath}";
                }
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
        var doubleValue = Convert.ToDouble(value);

        // Check if it's a whole number
        if (doubleValue == Math.Floor(doubleValue) && !double.IsInfinity(doubleValue) && !double.IsNaN(doubleValue))
        {
            // For small whole numbers (1-20) that are commonly used as method parameters
            // (precision, count, index), use the integer form to avoid ambiguous overloads
            // But exclude 0 since it's often used as an accumulator initial value
            if (doubleValue >= 1 && doubleValue <= 20 && doubleValue == Math.Floor(doubleValue))
            {
                return ((int)doubleValue).ToString();
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
            && Convert.ToDouble(literal.Value) == 0
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
            // Special case: if alternate is wrapper.Get(), cast it with ToString()
            if (_useFormDataWrapper && alternate.Contains("wrapper.Get("))
            {
                alternate = $"({alternate}?.ToString() ?? \"\")";
            }
            else if (!alternate.Trim().StartsWith("\""))
            {
                // It's not already a string literal
                alternate = $"({alternate}?.ToString() ?? \"\")";
            }
        }
        else if (!consequentIsString && alternateIsString)
        {
            // Alternate is string, consequent is not - convert consequent to string
            // Special case: if consequent is wrapper.Get(), cast it with ToString()
            if (_useFormDataWrapper && consequent.Contains("wrapper.Get("))
            {
                consequent = $"({consequent}?.ToString() ?? \"\")";
            }
            else if (!consequent.Trim().StartsWith("\""))
            {
                // It's not already a string literal
                consequent = $"({consequent}?.ToString() ?? \"\")";
            }
        }

        // In JavaScript, any value can be used as a condition (truthy/falsy)
        // In C#, we need an explicit boolean expression
        // Check if the test might be a numeric value that needs explicit != 0 check
        var testNeedsBooleanConversion = TestNeedsBooleanConversion(conditional.Test);
        if (testNeedsBooleanConversion)
        {
            // Don't wrap wrapper.Get() with Convert.ToDecimal - let it fail at compile time if types don't match
            test = $"({test} != 0m)";
        }

        // Handle nullable ternary operator - in JS, numbers can be null/undefined
        // but in C#, we can't use ? on non-nullable types like double
        // If consequent or alternate contains numeric operations that result in double,
        // the ternary operator itself should work with doubles (not double?)
        // The issue arises when we try to apply ? operator to a double literal or expression

        // Check if this is a pattern like: something ? 123.0 : 0.0
        // In this case, both branches are non-nullable doubles, so the result is double (not double?)
        // No special handling needed - C# will infer the correct type

        return $"({test} ? {consequent} : {alternate})";
    }

    private bool TestNeedsBooleanConversion(Expression expr)
    {
        // Check if the expression is likely to produce a numeric result that needs != 0 check
        return expr switch
        {
            Identifier id => !IsIdentifierStringType(id), // Only convert if not a string variable
            UnaryExpression unary => unary.Operator.ToString() == "UnaryPlus", // Unary + always returns number
            MemberExpression member => !IsMemberExpressionStringType(member), // Only convert if not a string property
            CallExpression call => !IsCallExpressionReturningBoolean(call), // Some functions return bool
            Literal lit => lit.Value is int or long or double or float, // Numeric literals
            _ => false, // For logical/comparison expressions, assume they already return boolean
        };
    }

    private bool IsIdentifierStringType(Identifier id)
    {
        // Check if this identifier is a known string-typed local variable
        if (_localVariableTypes.TryGetValue(id.Name, out var isString))
        {
            return isString;
        }
        return false;
    }

    private bool IsMemberExpressionStringType(MemberExpression member)
    {
        // Check if this member expression refers to a string-typed property
        // For obj.property patterns where property is a local variable
        if (member.Object is Identifier && member.Property is Identifier propId)
        {
            if (_localVariableTypes.TryGetValue(propId.Name, out var isString))
            {
                return isString;
            }
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
        // In JavaScript, +obj.property coerces to number
        // In C#, we need explicit conversion
        var expr = ConvertExpression(argument);

        // Check if the argument is a simple identifier that's already a local variable
        // If the variable is already declared (e.g., as a function parameter with ?? 0m),
        // we can just use the variable directly since it's already defaulted to 0m
        if (argument is Identifier id && _localVariables.ContainsKey(id.Name))
        {
            // Local variable that's already declared - just use it directly
            // The ?? 0m at declaration already handles the defaulting
            return expr;
        }

        // For member expressions like obj.property where property is an input param
        if (
            argument is MemberExpression member
            && member.Object is Identifier objId
            && member.Property is Identifier propId
            && _localVariables.ContainsKey(propId.Name)
        )
        {
            // This is obj.property where property is a local variable (input param)
            // Just use the property name directly since it's already defaulted
            return propId.Name;
        }

        // For complex expressions or wrapper.Get() calls, use TryParse pattern
        // Generate unique temp variable name
        var tempVar = $"_temp{_tempVarCounter++}";

        // Use decimal instead of double to match Altinn data model types
        // Most numeric fields in Altinn data models are decimal or decimal?
        return $"(decimal.TryParse({expr}?.ToString() ?? \"\", out var {tempVar}) ? {tempVar} : 0m)";
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
            if (TestNeedsBooleanConversion(logical.Left))
            {
                // Don't wrap wrapper.Get() with Convert.ToDouble - let it fail at compile time if types don't match
                if (logical.Left is not BinaryExpression && logical.Left is not LogicalExpression)
                {
                    // For other numeric expressions, add != 0 check
                    left = $"({left} != 0m)";
                }
            }

            // Check if right side needs boolean conversion
            if (TestNeedsBooleanConversion(logical.Right))
            {
                // Don't wrap wrapper.Get() with Convert.ToDecimal - let it fail at compile time if types don't match
                if (logical.Right is not BinaryExpression && logical.Right is not LogicalExpression)
                {
                    // For other numeric expressions, add != 0 check
                    right = $"({right} != 0m)";
                }
            }
        }

        return $"({left} {op} {right})";
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

            // When using FormDataWrapper, wrapper.Get() returns object?, so we need to cast to string for string methods
            var needsStringCast = _useFormDataWrapper && !isLocalVariable;

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

                    if (needsStringCast)
                    {
                        return $"({obj}?.ToString())";
                    }
                    return $"{obj}{nullConditional}.ToString()";

                case "toUpperCase":
                    if (needsStringCast)
                    {
                        return $"(({obj} as string)?.ToUpper())";
                    }
                    return $"{obj}{nullConditional}.ToUpper()";

                case "toLowerCase":
                    if (needsStringCast)
                    {
                        return $"(({obj} as string)?.ToLower())";
                    }
                    return $"{obj}{nullConditional}.ToLower()";

                case "trim":
                    if (needsStringCast)
                    {
                        return $"(({obj} as string)?.Trim())";
                    }
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

                        // When using FormDataWrapper, wrapper.Get() returns object? and needs casting
                        if (needsStringCast)
                        {
                            return $"(({obj} as string)?.Split({separator}))";
                        }

                        // When NOT using FormDataWrapper but using Dictionary<string, object?>,
                        // variables from the dictionary are also object? and need casting
                        // In dictionary mode, all local variables are potentially object? from dict access
                        var needsDictionaryCast = !_useFormDataWrapper && isLocalVariable;

                        if (needsDictionaryCast)
                        {
                            // In .NET 6+, Split with char[] on nullable string requires StringSplitOptions
                            // Use StringSplitOptions.None to maintain default behavior
                            if (separator.StartsWith("new[] {"))
                            {
                                return $"(({obj} as string)?.Split({separator}, StringSplitOptions.None))";
                            }
                            return $"(({obj} as string)?.Split({separator}))";
                        }

                        // In .NET 6+, Split with char[] on nullable string requires StringSplitOptions
                        if (nullConditional == "?" && separator.StartsWith("new[] {"))
                        {
                            return $"{obj}{nullConditional}.Split({separator}, StringSplitOptions.None)";
                        }
                        return $"{obj}{nullConditional}.Split({separator})";
                    }
                    // Split() with no arguments is not valid in C# - use default whitespace split
                    if (needsStringCast)
                    {
                        return $"(({obj} as string)?.Split(new[] {{ ' ', '\\t', '\\n', '\\r' }}, StringSplitOptions.RemoveEmptyEntries))";
                    }
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
                            int intValue = (int)double.Parse(searchValueTrimmed);
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
                        if (needsStringCast)
                        {
                            // FormDataWrapper returns object?, cast to string
                            return $"(({obj} as string)?.Contains({searchValue}) == true)";
                        }
                        else if (isLocalVariable)
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
                        // If testString is from FormDataWrapper, it needs to be cast to string
                        // Check if testString looks like a wrapper.Get() call
                        if (_useFormDataWrapper && testString.Contains("wrapper.Get("))
                        {
                            testString = $"({testString} as string)";
                        }
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
