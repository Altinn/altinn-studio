using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.DataProcessingRules;

/// <summary>
/// Updates Program.cs to register IDataWriteProcessor implementations
/// </summary>
internal sealed class ProgramCsUpdater
{
    private readonly string _appBasePath;

    public ProgramCsUpdater(string appBasePath)
    {
        _appBasePath = appBasePath;
    }

    /// <summary>
    /// Register a data processor in Program.cs using Roslyn
    /// </summary>
    /// <param name="className">The class name (e.g., "ChangenameDataProcessor")</param>
    /// <returns>True if registration was added or already exists, false if Program.cs not found</returns>
    public bool RegisterDataProcessor(string className)
    {
        // Try with App folder first, then without
        var programCsPath = Path.Combine(_appBasePath, "App", "Program.cs");
        if (!File.Exists(programCsPath))
        {
            programCsPath = Path.Combine(_appBasePath, "Program.cs");
        }

        if (!File.Exists(programCsPath))
        {
            Console.WriteLine($"Warning: Program.cs not found at {programCsPath}");
            return false;
        }

        var content = File.ReadAllText(programCsPath);

        // Parse the file using Roslyn
        var tree = CSharpSyntaxTree.ParseText(content);
        var root = tree.GetRoot();

        // Use the rewriter to add the registration
        var rewriter = new ProgramCsRewriter(className);
        var newRoot = rewriter.Visit(root);

        if (!rewriter.RegistrationAdded)
        {
            Console.WriteLine($"Warning: Could not find RegisterCustomAppServices method in {programCsPath}");
            Console.WriteLine($"Please manually add: services.AddTransient<IDataWriteProcessor, {className}>();");
            return false;
        }

        // Check if the using statement needs to be added
        var compilationUnit = newRoot as CompilationUnitSyntax;
        if (compilationUnit != null)
        {
            var hasUsingStatement = compilationUnit.Usings.Any(u =>
                u.Name?.ToString() == "Altinn.App.Logic.ConvertedLegacyRules"
            );

            if (!hasUsingStatement)
            {
                // Add the using statement - copy trivia from an existing using statement
                var newUsing = SyntaxFactory
                    .UsingDirective(SyntaxFactory.ParseName("Altinn.App.Logic.ConvertedLegacyRules"))
                    .WithUsingKeyword(
                        SyntaxFactory.Token(SyntaxKind.UsingKeyword).WithTrailingTrivia(SyntaxFactory.Space)
                    );

                // If there are existing usings, copy the trivia pattern from the last one
                if (compilationUnit.Usings.Count > 0)
                {
                    var lastUsing = compilationUnit.Usings[^1];
                    newUsing = newUsing
                        .WithLeadingTrivia(lastUsing.GetLeadingTrivia())
                        .WithTrailingTrivia(lastUsing.GetTrailingTrivia());
                }
                else
                {
                    newUsing = newUsing.WithTrailingTrivia(SyntaxFactory.LineFeed);
                }

                compilationUnit = compilationUnit.AddUsings(newUsing);
                newRoot = compilationUnit;
            }
        }

        // Write back the updated content
        // Use ToFullString() to preserve original formatting as much as possible
        File.WriteAllText(programCsPath, newRoot.ToFullString());
        Console.WriteLine($"  Registered {className} in Program.cs");

        return true;
    }
}
