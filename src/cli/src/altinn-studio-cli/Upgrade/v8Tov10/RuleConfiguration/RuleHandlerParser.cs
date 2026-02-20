using Acornima;
using Acornima.Ast;
using Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.Models;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration;

/// <summary>
/// Parses RuleHandler.js files to extract function implementations using Acornima AST parser
/// </summary>
internal sealed class RuleHandlerParser
{
    private readonly string _ruleHandlerPath;
    private readonly Dictionary<string, JavaScriptFunction> _conditionalFunctions = new();
    private readonly Dictionary<string, JavaScriptFunction> _dataProcessingFunctions = new();
    private readonly Dictionary<string, object> _globalConstants = new();

    public RuleHandlerParser(string ruleHandlerPath)
    {
        _ruleHandlerPath = ruleHandlerPath;
    }

    /// <summary>
    /// Parse the RuleHandler.js file
    /// </summary>
    public void Parse()
    {
        if (!File.Exists(_ruleHandlerPath))
        {
            // It's okay if the file doesn't exist - some layout sets may not have it
            return;
        }

        var jsContent = File.ReadAllText(_ruleHandlerPath);

        try
        {
            var parser = new Parser();
            var program = parser.ParseScript(jsContent);

            // Extract global constants first (they may be used in function bodies)
            ExtractGlobalConstants(program);

            ExtractFunctionsFromObject(program, "conditionalRuleHandlerObject", _conditionalFunctions);
            ExtractFunctionsFromObject(program, "ruleHandlerObject", _dataProcessingFunctions);
        }
        catch (Exception ex)
        {
            // Log or handle parsing errors if needed
            // For now, we'll silently fail to maintain backward compatibility
            Console.Error.WriteLine($"[Error] Failed to parse {_ruleHandlerPath}: {ex.Message}");
        }
    }

    /// <summary>
    /// Get conditional rendering function by name
    /// </summary>
    public JavaScriptFunction? GetConditionalFunction(string functionName)
    {
        return _conditionalFunctions.GetValueOrDefault(functionName);
    }

    /// <summary>
    /// Get data processing function by name
    /// </summary>
    public JavaScriptFunction? GetDataProcessingFunction(string functionName)
    {
        return _dataProcessingFunctions.GetValueOrDefault(functionName);
    }

    /// <summary>
    /// Get all global constants extracted from the file
    /// </summary>
    public IReadOnlyDictionary<string, object> GetGlobalConstants()
    {
        return _globalConstants;
    }

    /// <summary>
    /// Get all conditional functions for cross-function inlining
    /// </summary>
    public Dictionary<string, JavaScriptFunction> GetAllConditionalFunctions()
    {
        return _conditionalFunctions;
    }

    /// <summary>
    /// Extract functions from a JavaScript object declaration using AST
    /// </summary>
    private void ExtractFunctionsFromObject(
        Script program,
        string objectName,
        Dictionary<string, JavaScriptFunction> targetDict
    )
    {
        // Find the variable declaration for the object
        foreach (var statement in program.Body)
        {
            if (statement is VariableDeclaration varDecl)
            {
                foreach (var declarator in varDecl.Declarations)
                {
                    if (declarator.Id is Identifier identifier && identifier.Name == objectName)
                    {
                        // Found the object, now extract its functions
                        if (declarator.Init is ObjectExpression objExpr)
                        {
                            ExtractFunctionsFromObjectExpression(objExpr, targetDict);
                        }
                        return;
                    }
                }
            }
        }
    }

    /// <summary>
    /// Extract functions from an ObjectExpression AST node
    /// </summary>
    private void ExtractFunctionsFromObjectExpression(
        ObjectExpression objExpr,
        Dictionary<string, JavaScriptFunction> targetDict
    )
    {
        foreach (var property in objExpr.Properties)
        {
            if (property is Property prop)
            {
                // Get the function name from the property key
                string? functionName = null;
                if (prop.Key is Identifier keyId)
                {
                    functionName = keyId.Name;
                }
                else if (prop.Key is Literal keyLit && keyLit.Value is string keyStr)
                {
                    functionName = keyStr;
                }

                if (functionName == null)
                {
                    continue;
                }

                // Check if the value is a function (regular function or arrow function)
                IFunction? function = prop.Value switch
                {
                    FunctionExpression fe => fe,
                    ArrowFunctionExpression afe => afe,
                    _ => null,
                };

                if (function != null)
                {
                    var paramName =
                        function.Params.Count > 0 && function.Params[0] is Identifier paramId
                            ? paramId.Name
                            : string.Empty;

                    // Reconstruct the function implementation from the AST
                    var functionImpl = ReconstructFunction(function);

                    // Extract the return expression for potential inlining
                    var returnExpression = ExtractReturnExpression(function);

                    targetDict[functionName] = new JavaScriptFunction
                    {
                        Name = functionName,
                        Implementation = functionImpl,
                        ParameterName = paramName,
                        ReturnExpression = returnExpression,
                        FunctionAst = function,
                    };
                }
            }
        }
    }

    /// <summary>
    /// Reconstruct a function implementation string from a function AST node (FunctionExpression or ArrowFunctionExpression)
    /// </summary>
    private string ReconstructFunction(IFunction function)
    {
        // Get the original source code for the function
        // Acornima preserves the original range, so we can extract it
        var start = function.Range.Start;
        var end = function.Range.End;

        var jsContent = File.ReadAllText(_ruleHandlerPath);
        var functionCode = jsContent.Substring(start, end - start);

        // If this is a FunctionExpression (anonymous function), wrap it in parentheses
        // so it can be parsed as an expression statement
        if (function is FunctionExpression)
        {
            functionCode = $"({functionCode})";
        }

        return functionCode;
    }

    /// <summary>
    /// Extract global constants from variable declarations at the top level of the script
    /// Only extracts simple literal values (numbers, strings, booleans, null)
    /// </summary>
    private void ExtractGlobalConstants(Script program)
    {
        foreach (var statement in program.Body)
        {
            if (statement is VariableDeclaration varDecl)
            {
                foreach (var declarator in varDecl.Declarations)
                {
                    // Only extract simple constant assignments: var NAME = value;
                    if (declarator.Id is Identifier identifier && declarator.Init is Literal literal)
                    {
                        var constantName = identifier.Name;
                        var constantValue = literal.Value;

                        // Only store simple literal values (numbers, strings, booleans, null)
                        if (constantValue is int or long or double or float or string or bool || constantValue == null)
                        {
                            _globalConstants[constantName] = constantValue ?? "null";
                        }
                    }
                }
            }
        }
    }

    /// <summary>
    /// Extract the return expression from a function for inlining purposes
    /// </summary>
    private Expression? ExtractReturnExpression(IFunction function)
    {
        // Get the function body
        var body = function.Body;

        // Arrow function with expression body: (obj) => expression
        if (body is Expression expr)
        {
            return expr;
        }

        // Arrow function or regular function with block body
        if (body is BlockStatement blockBody)
        {
            // Find the return statement
            foreach (var statement in blockBody.Body)
            {
                if (statement is ReturnStatement returnStmt)
                {
                    return returnStmt.Argument;
                }
            }
        }

        return null;
    }
}
