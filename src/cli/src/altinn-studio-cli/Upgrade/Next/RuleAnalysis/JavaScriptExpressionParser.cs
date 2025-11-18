using Acornima;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis;

/// <summary>
/// Parses JavaScript function bodies and extracts return expressions for conversion to expression language
/// </summary>
public class JavaScriptExpressionParser
{
    public ParseResult ParseFunction(string functionBody)
    {
        try
        {
            // Wrap the body in a function to make it valid JavaScript
            // This allows us to parse return statements properly
            var wrappedCode = $"(function() {{ {functionBody} }})";

            // Create parser with tolerant mode to handle some syntax variations
            var parser = new Parser();

            // Parse as script (not module)
            var program = parser.ParseScript(wrappedCode);

            // Extract the function body from the wrapped IIFE
            if (
                program.Body.Count > 0
                && program.Body[0] is ExpressionStatement exprStmt
                && exprStmt.Expression is FunctionExpression funcExpr
            )
            {
                var functionStatements = funcExpr.Body.Body.ToList();
                return AnalyzeFunctionBody(functionStatements, functionBody);
            }

            return new ParseResult
            {
                Success = false,
                ErrorMessage = "Could not extract function body from parsed code",
                OriginalCode = functionBody,
            };
        }
        catch (Exception ex)
        {
            return new ParseResult
            {
                Success = false,
                ErrorMessage = $"Failed to parse JavaScript: {ex.Message}",
                OriginalCode = functionBody,
            };
        }
    }

    private ParseResult AnalyzeFunctionBody(List<Statement> statements, string originalCode)
    {
        if (statements.Count == 0)
        {
            return new ParseResult
            {
                Success = false,
                ErrorMessage = "Empty function body",
                OriginalCode = originalCode,
            };
        }

        var returnStatement = FindReturnStatement(statements);
        if (returnStatement == null)
        {
            return new ParseResult
            {
                Success = false,
                ErrorMessage = "No return statement found",
                OriginalCode = originalCode,
            };
        }

        return new ParseResult
        {
            Success = true,
            ReturnExpression = returnStatement.Argument,
            OriginalCode = originalCode,
            AllStatements = statements,
        };
    }

    private ReturnStatement? FindReturnStatement(List<Statement> statements)
    {
        // Check each statement
        foreach (var stmt in statements)
        {
            if (stmt is ReturnStatement returnStmt)
            {
                return returnStmt;
            }

            // Check inside if statements
            if (stmt is IfStatement ifStmt)
            {
                var returnInConsequent = FindReturnInStatement(ifStmt.Consequent);
                if (returnInConsequent != null)
                    return returnInConsequent;

                if (ifStmt.Alternate != null)
                {
                    var returnInAlternate = FindReturnInStatement(ifStmt.Alternate);
                    if (returnInAlternate != null)
                        return returnInAlternate;
                }
            }

            // Check inside block statements
            if (stmt is BlockStatement block)
            {
                var returnInBlock = FindReturnStatement(block.Body.ToList());
                if (returnInBlock != null)
                    return returnInBlock;
            }
        }

        return null;
    }

    private ReturnStatement? FindReturnInStatement(Statement statement)
    {
        if (statement is ReturnStatement returnStmt)
            return returnStmt;

        if (statement is BlockStatement block)
            return FindReturnStatement(block.Body.ToList());

        return null;
    }
}

public class ParseResult
{
    public bool Success { get; set; }
    public Expression? ReturnExpression { get; set; }
    public string? ErrorMessage { get; set; }
    public string OriginalCode { get; set; } = string.Empty;
    public List<Statement>? AllStatements { get; set; }
}
