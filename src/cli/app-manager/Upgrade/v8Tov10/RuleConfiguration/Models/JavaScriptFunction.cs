using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.Models;

/// <summary>
/// Represents a JavaScript function extracted from RuleHandler.js
/// </summary>
public class JavaScriptFunction
{
    /// <summary>
    /// Function name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Full function implementation as string (including function signature)
    /// </summary>
    public string Implementation { get; set; } = string.Empty;

    /// <summary>
    /// Parameter name from function signature (usually 'obj')
    /// </summary>
    public string ParameterName { get; set; } = string.Empty;

    /// <summary>
    /// Parsed return expression AST for inlining into other functions
    /// </summary>
    public Expression? ReturnExpression { get; set; }

    /// <summary>
    /// Full function AST for data processing conversions
    /// </summary>
    public IFunction? FunctionAst { get; set; }
}
