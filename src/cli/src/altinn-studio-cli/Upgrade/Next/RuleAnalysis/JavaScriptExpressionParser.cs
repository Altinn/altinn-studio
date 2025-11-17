using Acornima;
using Acornima.Ast;
using Jint;
using Jint.Native;

namespace AltinnCLI.Upgrade.Next.RuleAnalysis;

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
                StatementCount = 0,
            };
        }

        // Count meaningful statements
        var meaningfulStatements = CountMeaningfulStatements(statements);

        // Find the return statement
        var returnStatement = FindReturnStatement(statements);

        if (returnStatement == null)
        {
            return new ParseResult
            {
                Success = false,
                ErrorMessage = "No return statement found",
                OriginalCode = originalCode,
                StatementCount = meaningfulStatements,
            };
        }

        return new ParseResult
        {
            Success = true,
            ReturnExpression = returnStatement.Argument,
            StatementCount = meaningfulStatements,
            OriginalCode = originalCode,
            AllStatements = statements,
        };
    }

    private ParseResult AnalyzeProgram(Acornima.Ast.Program program, string originalCode)
    {
        var statements = program.Body.ToList();

        if (statements.Count == 0)
        {
            return new ParseResult
            {
                Success = false,
                ErrorMessage = "Empty function body",
                OriginalCode = originalCode,
                StatementCount = 0,
            };
        }

        // Count meaningful statements (excluding variable declarations that are just coercion)
        var meaningfulStatements = CountMeaningfulStatements(statements);

        // Find the return statement
        var returnStatement = FindReturnStatement(statements);

        if (returnStatement == null)
        {
            return new ParseResult
            {
                Success = false,
                ErrorMessage = "No return statement found",
                OriginalCode = originalCode,
                StatementCount = meaningfulStatements,
            };
        }

        return new ParseResult
        {
            Success = true,
            ReturnExpression = returnStatement.Argument,
            StatementCount = meaningfulStatements,
            OriginalCode = originalCode,
            AllStatements = statements,
        };
    }

    private int CountMeaningfulStatements(List<Statement> statements)
    {
        int count = 0;
        foreach (var stmt in statements)
        {
            // Return statements are meaningful
            if (stmt is ReturnStatement)
            {
                count++;
                continue;
            }

            // Expression statements might be meaningful
            if (stmt is ExpressionStatement exprStmt)
            {
                // Assignment expressions are usually type coercion (obj.value = +obj.value)
                // We'll count them as meaningful for complexity analysis
                count++;
                continue;
            }

            // If statements, blocks, etc. are complex
            if (stmt is IfStatement || stmt is BlockStatement)
            {
                count++;
                continue;
            }

            // Variable declarations
            if (stmt is VariableDeclaration)
            {
                count++;
                continue;
            }
        }
        return count;
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
    public int StatementCount { get; set; }
    public string? ErrorMessage { get; set; }
    public string OriginalCode { get; set; } = string.Empty;
    public List<Statement>? AllStatements { get; set; }

    public bool IsSimple => Success && StatementCount == 1;
    public bool IsComplex => Success && StatementCount > 2;
}
