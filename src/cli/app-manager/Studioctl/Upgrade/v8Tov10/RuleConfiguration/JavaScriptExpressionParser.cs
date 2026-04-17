using Acornima;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration;

/// <summary>
/// Parses JavaScript function bodies and extracts return expressions for conversion to expression language
/// </summary>
public class JavaScriptExpressionParser
{
    public ParseResult ParseFunction(string functionCode)
    {
        try
        {
            var parser = new Parser();
            var program = parser.ParseScript(functionCode);

            // Try to extract function from the parsed AST
            if (program.Body.Count == 0)
            {
                return new ParseResult
                {
                    Success = false,
                    ErrorMessage = "Empty program body",
                    OriginalCode = functionCode,
                };
            }

            var firstStatement = program.Body[0];
            List<Statement>? functionStatements = null;

            // Case 1: ExpressionStatement containing a function
            if (firstStatement is ExpressionStatement exprStmt)
            {
                // Arrow function expression: (obj) => { ... } or (obj) => expr
                if (exprStmt.Expression is ArrowFunctionExpression arrowFunc)
                {
                    functionStatements = ExtractStatementsFromArrowFunction(arrowFunc);
                }
                // Regular function expression: function(obj) { ... }
                else if (exprStmt.Expression is FunctionExpression funcExpr)
                {
                    functionStatements = funcExpr.Body.Body.ToList();
                }
            }
            // Case 2: Function declaration: function foo(obj) { ... }
            else if (firstStatement is FunctionDeclaration funcDecl)
            {
                functionStatements = funcDecl.Body.Body.ToList();
            }

            if (functionStatements == null)
            {
                return new ParseResult
                {
                    Success = false,
                    ErrorMessage = "Could not extract function body from parsed code",
                    OriginalCode = functionCode,
                };
            }

            return AnalyzeFunctionBody(functionStatements, functionCode);
        }
        catch (Exception ex)
        {
            return new ParseResult
            {
                Success = false,
                ErrorMessage = $"Failed to parse JavaScript: {ex.Message}",
                OriginalCode = functionCode,
            };
        }
    }

    /// <summary>
    /// Extract statements from an arrow function, handling both block and expression bodies
    /// </summary>
    private List<Statement> ExtractStatementsFromArrowFunction(ArrowFunctionExpression arrowFunc)
    {
        // Arrow function with block body: (obj) => { statements }
        if (arrowFunc.Body is BlockStatement blockBody)
        {
            return blockBody.Body.ToList();
        }

        // Arrow function with expression body: (obj) => expression
        // Wrap the expression in a return statement
        if (arrowFunc.Body is Expression expr)
        {
            var returnStmt = new ReturnStatement(expr);
            return new List<Statement> { returnStmt };
        }

        return new List<Statement>();
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

        // Extract variable mappings from destructuring and other declarations
        var variableMappings = ExtractVariableMappings(statements);

        // Try to build a single conditional expression from all statements
        var expression = BuildConditionalExpression(statements);
        if (expression == null)
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
            ReturnExpression = expression,
            OriginalCode = originalCode,
            AllStatements = statements,
            VariableMappings = variableMappings,
        };
    }

    /// <summary>
    /// Extract variable mappings from destructuring assignments and variable declarations
    /// </summary>
    private Dictionary<string, string> ExtractVariableMappings(List<Statement> statements)
    {
        var mappings = new Dictionary<string, string>();

        foreach (var stmt in statements)
        {
            if (stmt is not VariableDeclaration varDecl)
                continue;

            foreach (var declarator in varDecl.Declarations)
            {
                // Handle destructuring: const { prop } = obj
                if (declarator.Id is ObjectPattern objPattern && declarator.Init is Identifier source)
                {
                    foreach (var prop in objPattern.Properties)
                    {
                        if (prop is Property property)
                        {
                            var propName = property.Key switch
                            {
                                Identifier id => id.Name,
                                _ => null,
                            };

                            var valueName = property.Value switch
                            {
                                Identifier id => id.Name,
                                _ => null,
                            };

                            if (propName != null && valueName != null)
                            {
                                // Map variable name to source.property
                                mappings[valueName] = $"{source.Name}.{propName}";
                            }
                        }
                    }
                }
            }
        }

        return mappings;
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

    /// <summary>
    /// Build a single conditional expression from a list of statements that may contain multiple return paths
    /// This converts early returns into nested conditional (ternary-like) expressions
    /// </summary>
    private Expression? BuildConditionalExpression(List<Statement> statements)
    {
        if (statements.Count == 0)
            return null;

        // Handle single statement case first
        if (statements.Count == 1)
        {
            var stmt = statements[0];

            // Direct return statement
            if (stmt is ReturnStatement returnStmt)
            {
                return returnStmt.Argument;
            }

            // If statement that contains all the logic
            if (stmt is IfStatement singleIfStmt)
            {
                return BuildIfExpression(singleIfStmt, new List<Statement>());
            }
        }

        // Process multiple statements in order
        for (int i = 0; i < statements.Count; i++)
        {
            var stmt = statements[i];

            // Direct return statement
            if (stmt is ReturnStatement returnStmt)
            {
                return returnStmt.Argument;
            }

            // If statement with potential early returns
            if (stmt is IfStatement ifStmt)
            {
                // Get the remaining statements after this if statement
                var remainingStatements = statements.Skip(i + 1).ToList();

                // Build a conditional expression: if (condition) then consequent else (rest of code)
                return BuildIfExpression(ifStmt, remainingStatements);
            }
        }

        // No return statement found - this could be an implicit return undefined
        // which is typically used in conditional rendering rules
        return null;
    }

    /// <summary>
    /// Build a conditional expression from an if statement
    /// This handles the conversion: if (cond) { return X; } ... → cond ? X : (rest)
    /// </summary>
    private Expression? BuildIfExpression(IfStatement ifStmt, List<Statement> remainingStatements)
    {
        // Get the condition
        var condition = ifStmt.Test;

        // Process the consequent (if branch)
        var consequentExpression = ExtractExpressionFromStatement(ifStmt.Consequent, new List<Statement>());
        if (consequentExpression == null)
            return null;

        // Process the alternate (else branch) or remaining statements
        Expression? alternateExpression;

        if (ifStmt.Alternate != null)
        {
            // There's an explicit else clause
            alternateExpression = ExtractExpressionFromStatement(ifStmt.Alternate, remainingStatements);
        }
        else
        {
            // No else clause - continue with remaining statements
            alternateExpression = BuildConditionalExpression(remainingStatements);
        }

        // If there's no alternate expression (no else, no remaining statements),
        // this means an implicit return false/undefined
        // For conditional rendering, if (condition) { return true; } with no else means:
        // condition ? true : false, which simplifies to just the condition
        if (alternateExpression == null)
        {
            // Check if the consequent is a literal true
            if (consequentExpression is Literal literal && literal.Value is true)
            {
                // if (cond) return true; (no else) → just use the condition
                return condition;
            }

            // Otherwise, use false as the alternate
            alternateExpression = new BooleanLiteral(false, "false");
        }

        // Create a ConditionalExpression (ternary operator: condition ? consequent : alternate)
        return new ConditionalExpression(condition, consequentExpression, alternateExpression);
    }

    /// <summary>
    /// Extract an expression from a statement (handles blocks, returns, and nested ifs)
    /// </summary>
    private Expression? ExtractExpressionFromStatement(Statement statement, List<Statement> fallbackStatements)
    {
        // Direct return statement
        if (statement is ReturnStatement returnStmt)
        {
            return returnStmt.Argument;
        }

        // Block statement - process the statements inside
        if (statement is BlockStatement block)
        {
            var blockStatements = block.Body.ToList();
            return BuildConditionalExpression(blockStatements);
        }

        // Nested if statement
        if (statement is IfStatement nestedIf)
        {
            return BuildIfExpression(nestedIf, fallbackStatements);
        }

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

    /// <summary>
    /// Maps variable names to their source property paths
    /// For example: { "summertRisiko" => "obj.summertRisiko" }
    /// </summary>
    public Dictionary<string, string> VariableMappings { get; set; } = new();
}
