using System.Text.RegularExpressions;
using Acornima;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

/// <summary>
/// Result of analyzing an inline script
/// </summary>
internal sealed record ScriptAnalysisResult
{
    /// <summary>
    /// Whether this is a standard template script (safe to delete)
    /// </summary>
    public required bool IsStandard { get; init; }

    /// <summary>
    /// Human-readable description
    /// </summary>
    public required string Description { get; init; }

    /// <summary>
    /// For non-standard scripts: The cleaned content with boilerplate removed.
    /// Null if the script is standard or has no custom content.
    /// </summary>
    public string? CleanedContent { get; init; }
}

/// <summary>
/// Analyzes inline scripts using AST parsing for strict template matching.
/// Uses a whitelist approach: only exact known patterns are considered standard.
/// </summary>
internal sealed partial class StrictScriptAnalyzer
{
    /// <summary>
    /// Analyzes an inline script and returns detailed analysis result
    /// </summary>
    public ScriptAnalysisResult Analyze(string scriptContent)
    {
        if (string.IsNullOrWhiteSpace(scriptContent))
        {
            return new ScriptAnalysisResult { IsStandard = false, Description = "Empty script" };
        }

        var normalized = NormalizeWhitespace(scriptContent);

        // Quick check: loadScript(); call only
        if (IsLoadScriptCallOnly(normalized))
        {
            return new ScriptAnalysisResult { IsStandard = true, Description = "loadScript() call only" };
        }

        // Use AST parsing for detailed analysis
        return AnalyzeWithAst(scriptContent);
    }

    private ScriptAnalysisResult AnalyzeWithAst(string scriptContent)
    {
        try
        {
            var parser = new Parser();
            var program = parser.ParseScript(scriptContent);
            var statements = program.Body.ToList();

            if (statements.Count == 0)
            {
                return new ScriptAnalysisResult { IsStandard = false, Description = "Empty script body" };
            }

            // Check if this is a loadScript function definition
            var loadScriptFunc = FindLoadScriptFunction(statements);
            if (loadScriptFunc != null)
            {
                return AnalyzeLoadScriptFunction(loadScriptFunc, statements);
            }

            // Analyze as inline init script
            return AnalyzeInlineInitScript(scriptContent, statements);
        }
        catch (Exception ex)
        {
            // If we can't parse it, it's not a known pattern
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = $"Failed to parse script: {ex.Message}",
            };
        }
    }

    private static FunctionDeclaration? FindLoadScriptFunction(List<Statement> statements)
    {
        foreach (var stmt in statements)
        {
            if (
                stmt is FunctionDeclaration func
                && func.Id?.Name.Equals("loadScript", StringComparison.OrdinalIgnoreCase) == true
            )
            {
                return func;
            }
        }
        return null;
    }

    private ScriptAnalysisResult AnalyzeLoadScriptFunction(
        FunctionDeclaration loadScriptFunc,
        List<Statement> allStatements
    )
    {
        // Check if there are statements outside the loadScript function
        var statementsOutsideFunction = allStatements.Where(s => s != loadScriptFunc).ToList();
        if (statementsOutsideFunction.Count > 0)
        {
            // Allow boilerplate statements outside the function (e.g., window.featureToggles = ...)
            var nonBoilerplateOutside = statementsOutsideFunction.Where(s => !IsBoilerplateStatement(s)).ToList();
            if (nonBoilerplateOutside.Count > 0)
            {
                return new ScriptAnalysisResult
                {
                    IsStandard = false,
                    Description =
                        $"Script has {nonBoilerplateOutside.Count} non-boilerplate statement(s) outside loadScript function",
                };
            }
        }

        var funcBody = loadScriptFunc.Body.Body.ToList();
        var (windowAssignments, _) = CategorizeStatements(funcBody);

        // Must have window.org and window.app
        var hasOrg = windowAssignments.Any(a => a.Property == "org");
        var hasApp = windowAssignments.Any(a => a.Property == "app");

        if (!hasOrg || !hasApp)
        {
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = "loadScript missing window.org or window.app",
            };
        }

        // Check for unrecognized window.* assignments
        var unrecognizedWindowAssigns = windowAssignments.Where(a => !KnownWindowProperties.Contains(a.Property));

        if (unrecognizedWindowAssigns.Any())
        {
            var props = string.Join(", ", unrecognizedWindowAssigns.Select(a => $"window.{a.Property}"));
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = $"loadScript has unrecognized window assignments: {props}",
            };
        }

        // Check if all statements in the function body are boilerplate
        var nonBoilerplateStatements = funcBody.Where(s => !IsBoilerplateStatement(s)).ToList();

        if (nonBoilerplateStatements.Count > 0)
        {
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = $"loadScript has {nonBoilerplateStatements.Count} non-boilerplate statement(s)",
            };
        }

        return new ScriptAnalysisResult { IsStandard = true, Description = "Standard loadScript function" };
    }

    private ScriptAnalysisResult AnalyzeInlineInitScript(string scriptContent, List<Statement> statements)
    {
        // First check: if ALL statements are boilerplate, it's standard (safe to delete)
        // This handles standalone scripts like just "window.featureToggles = {...}"
        if (statements.All(IsBoilerplateStatement))
        {
            return new ScriptAnalysisResult { IsStandard = true, Description = "Standard boilerplate script" };
        }

        // Extract custom content (strip boilerplate like loadScript() calls)
        var cleanedContent = ExtractCustomContent(scriptContent, statements);

        // Script has non-boilerplate content - check for unrecognized window.* assignments
        var (windowAssignments, _) = CategorizeStatements(statements);

        var unrecognizedWindowAssigns = windowAssignments.Where(a => !KnownWindowProperties.Contains(a.Property));

        if (unrecognizedWindowAssigns.Any())
        {
            var props = string.Join(", ", unrecognizedWindowAssigns.Select(a => $"window.{a.Property}"));
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = $"Script has unrecognized window assignments: {props}",
                CleanedContent = cleanedContent,
            };
        }

        // If cleaned content is empty, all was boilerplate (shouldn't happen due to earlier check)
        if (string.IsNullOrWhiteSpace(cleanedContent))
        {
            return new ScriptAnalysisResult { IsStandard = true, Description = "Standard boilerplate script" };
        }

        return new ScriptAnalysisResult
        {
            IsStandard = false,
            Description = "Script has custom content",
            CleanedContent = cleanedContent,
        };
    }

    private sealed record WindowAssignment(string Property, Expression Value);

    private (List<WindowAssignment> WindowAssignments, List<Statement> OtherStatements) CategorizeStatements(
        List<Statement> statements
    )
    {
        var windowAssignments = new List<WindowAssignment>();
        var otherStatements = new List<Statement>();

        foreach (var stmt in statements)
        {
            if (
                stmt is ExpressionStatement exprStmt
                && exprStmt.Expression is AssignmentExpression assign
                && assign.Left is MemberExpression member
                && member.Object is Identifier obj
                && obj.Name == "window"
                && member.Property is Identifier propId
            )
            {
                windowAssignments.Add(new WindowAssignment(propId.Name, assign.Right));
            }
            else
            {
                otherStatements.Add(stmt);
            }
        }

        return (windowAssignments, otherStatements);
    }

    private static bool IsAllowedStatement(Statement stmt)
    {
        // Allow empty statements (e.g., from double semicolons ;;)
        if (stmt is EmptyStatement)
            return true;

        // Allow var appId = ... declarations
        if (stmt is VariableDeclaration varDecl)
        {
            return varDecl.Declarations.Any(d => d.Id is Identifier id && id.Name == "appId");
        }

        return false;
    }

    /// <summary>
    /// Known window properties that are boilerplate from the standard template.
    /// </summary>
    private static readonly HashSet<string> KnownWindowProperties = new(StringComparer.Ordinal)
    {
        "org",
        "app",
        "reportee",
        "featureToggles",
    };

    /// <summary>
    /// Determines if a statement is boilerplate that should be stripped from extracted scripts.
    /// </summary>
    private static bool IsBoilerplateStatement(Statement stmt)
    {
        // Known window.* assignments: window.org, window.app, window.reportee, window.featureToggles
        if (
            stmt is ExpressionStatement exprStmt
            && exprStmt.Expression is AssignmentExpression assign
            && assign.Left is MemberExpression member
            && member.Object is Identifier obj
            && obj.Name == "window"
            && member.Property is Identifier propId
        )
        {
            return KnownWindowProperties.Contains(propId.Name);
        }

        // loadScript() call is boilerplate
        if (
            stmt is ExpressionStatement callStmt
            && callStmt.Expression is CallExpression call
            && call.Callee is Identifier calleeId
            && calleeId.Name.Equals("loadScript", StringComparison.OrdinalIgnoreCase)
        )
        {
            return true;
        }

        // Reuse IsAllowedStatement for appId declarations and empty statements
        return IsAllowedStatement(stmt);
    }

    /// <summary>
    /// Extracts only the custom (non-boilerplate) content from a script.
    /// </summary>
    private static string? ExtractCustomContent(string source, List<Statement> statements)
    {
        var customStatements = statements.Where(s => !IsBoilerplateStatement(s)).ToList();

        if (customStatements.Count == 0)
            return null;

        // Extract each statement's original text and join
        var parts = customStatements.Select(s => source.Substring(s.Range.Start, s.Range.End - s.Range.Start)).ToList();

        return string.Join("\n\n", parts).Trim();
    }

    private static bool IsLoadScriptCallOnly(string normalized)
    {
        return normalized.Equals("loadScript();", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("loadScript()", StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeWhitespace(string content)
    {
        return Regex.Replace(content, @"\s+", "").Trim();
    }
}
