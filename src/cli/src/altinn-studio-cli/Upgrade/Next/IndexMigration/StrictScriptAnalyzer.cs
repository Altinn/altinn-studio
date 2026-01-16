using System.Text.RegularExpressions;
using Acornima;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

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

        // Quick check: Cypress dev tools hook
        if (IsCypressDevToolsHook(normalized))
        {
            return new ScriptAnalysisResult { IsStandard = true, Description = "Cypress dev tools hook" };
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
            return AnalyzeInlineInitScript(statements);
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
        // loadScript function should be the only statement (besides possible trailing whitespace)
        if (allStatements.Count != 1)
        {
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = "Script has statements outside loadScript function",
            };
        }

        var funcBody = loadScriptFunc.Body.Body.ToList();
        var (windowAssignments, otherStatements) = CategorizeStatements(funcBody);

        // Check for recognized window.* assignments
        var hasOrg = windowAssignments.Any(a => a.Property == "org");
        var hasApp = windowAssignments.Any(a => a.Property == "app");
        var hasReportee = windowAssignments.Any(a => a.Property == "reportee");
        var hasFeatureToggles = windowAssignments.Any(a => a.Property == "featureToggles");

        // Must have window.org and window.app
        if (!hasOrg || !hasApp)
        {
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = "loadScript missing window.org or window.app",
            };
        }

        // Check for unrecognized window.* assignments
        var unrecognizedWindowAssigns = windowAssignments.Where(a =>
            a.Property != "org" && a.Property != "app" && a.Property != "reportee" && a.Property != "featureToggles"
        );

        if (unrecognizedWindowAssigns.Any())
        {
            var props = string.Join(", ", unrecognizedWindowAssigns.Select(a => $"window.{a.Property}"));
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = $"loadScript has unrecognized window assignments: {props}",
            };
        }

        // Check for unrecognized statements (beyond var appId declaration)
        var unexpectedStatements = otherStatements.Where(s => !IsAppIdDeclaration(s)).ToList();

        if (unexpectedStatements.Count > 0)
        {
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = $"loadScript has {unexpectedStatements.Count} unrecognized statement(s)",
            };
        }

        // All recognized - standard template (including old cruft like reportee/featureToggles)
        var desc = "Standard loadScript function";
        if (hasReportee)
            desc += " (with window.reportee - old template cruft)";
        if (hasFeatureToggles)
            desc += " (with window.featureToggles - old template cruft)";

        return new ScriptAnalysisResult { IsStandard = true, Description = desc };
    }

    private ScriptAnalysisResult AnalyzeInlineInitScript(List<Statement> statements)
    {
        var (windowAssignments, otherStatements) = CategorizeStatements(statements);

        // Check for recognized window.* assignments
        var hasOrg = windowAssignments.Any(a => a.Property == "org");
        var hasApp = windowAssignments.Any(a => a.Property == "app");
        var hasFeatureToggles = windowAssignments.Any(a => a.Property == "featureToggles");

        // Must have window.org and window.app for standard inline init
        if (!hasOrg || !hasApp)
        {
            // Not an init script - check if it's entirely unknown (needs extraction)
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = "Script does not match any known template pattern",
            };
        }

        // Check for unrecognized window.* assignments
        var unrecognizedWindowAssigns = windowAssignments.Where(a =>
            a.Property != "org" && a.Property != "app" && a.Property != "featureToggles"
        );

        if (unrecognizedWindowAssigns.Any())
        {
            var props = string.Join(", ", unrecognizedWindowAssigns.Select(a => $"window.{a.Property}"));
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = $"Script has unrecognized window assignments: {props}",
            };
        }

        // Check for unrecognized statements (beyond var/const appId declaration)
        var unexpectedStatements = otherStatements.Where(s => !IsAppIdDeclaration(s)).ToList();

        if (unexpectedStatements.Count > 0)
        {
            return new ScriptAnalysisResult
            {
                IsStandard = false,
                Description = $"Script has {unexpectedStatements.Count} unrecognized statement(s)",
            };
        }

        // All recognized - standard template
        var desc = "Standard inline init script";
        if (hasFeatureToggles)
            desc += " (with window.featureToggles - old template cruft)";

        return new ScriptAnalysisResult { IsStandard = true, Description = desc };
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

    private static bool IsAppIdDeclaration(Statement stmt)
    {
        if (stmt is not VariableDeclaration varDecl)
            return false;

        return varDecl.Declarations.Any(d => d.Id is Identifier id && id.Name == "appId");
    }

    private static bool IsLoadScriptCallOnly(string normalized)
    {
        return normalized.Equals("loadScript();", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("loadScript()", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsCypressDevToolsHook(string normalized)
    {
        // Match: if(window.Cypress){window["__REACT_DEVTOOLS_GLOBAL_HOOK__"]=window.parent["__REACT_DEVTOOLS_GLOBAL_HOOK__"];}
        return CypressDevToolsPattern().IsMatch(normalized);
    }

    private static string NormalizeWhitespace(string content)
    {
        return Regex.Replace(content, @"\s+", "").Trim();
    }

    [GeneratedRegex(
        @"if\(window\.Cypress\)\{window\[.?__REACT_DEVTOOLS_GLOBAL_HOOK__.?\]=window\.parent\[.?__REACT_DEVTOOLS_GLOBAL_HOOK__.?\];?\}",
        RegexOptions.IgnoreCase
    )]
    private static partial Regex CypressDevToolsPattern();
}
