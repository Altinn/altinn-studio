using Acornima;
using Acornima.Ast;
using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Models;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis;

/// <summary>
/// Parses RuleHandler.js files to extract function implementations using Acornima AST parser
/// </summary>
internal class RuleHandlerParser
{
    private readonly string _ruleHandlerPath;
    private readonly Dictionary<string, JavaScriptFunction> _conditionalFunctions = new();
    private readonly Dictionary<string, JavaScriptFunction> _dataProcessingFunctions = new();

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

            // Extract conditional rendering functions
            ExtractFunctionsFromObject(program, "conditionalRuleHandlerObject", _conditionalFunctions);

            // Extract data processing functions
            ExtractFunctionsFromObject(program, "ruleHandlerObject", _dataProcessingFunctions);
        }
        catch (Exception ex)
        {
            // Log or handle parsing errors if needed
            // For now, we'll silently fail to maintain backward compatibility
            Console.WriteLine($"Warning: Failed to parse {_ruleHandlerPath}: {ex.Message}");
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
                    if (declarator.Id is Identifier id && id.Name == objectName)
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

                // Check if the value is a function
                if (prop.Value is FunctionExpression funcExpr)
                {
                    var paramName =
                        funcExpr.Params.Count > 0 && funcExpr.Params[0] is Identifier paramId
                            ? paramId.Name
                            : string.Empty;

                    // Reconstruct the function implementation from the AST
                    var functionImpl = ReconstructFunction(funcExpr);

                    targetDict[functionName] = new JavaScriptFunction
                    {
                        Name = functionName,
                        Implementation = functionImpl,
                        ParameterName = paramName,
                    };
                }
            }
        }
    }

    /// <summary>
    /// Reconstruct a function implementation string from a FunctionExpression AST node
    /// </summary>
    private string ReconstructFunction(FunctionExpression funcExpr)
    {
        // Get the original source code for the function
        // Acornima preserves the original range, so we can extract it
        var start = funcExpr.Range.Start;
        var end = funcExpr.Range.End;

        var jsContent = File.ReadAllText(_ruleHandlerPath);
        return jsContent.Substring(start, end - start);
    }
}
