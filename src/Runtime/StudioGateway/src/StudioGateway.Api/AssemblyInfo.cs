using System.Diagnostics.CodeAnalysis;

// Suppress AOT warnings for Minimal APIs - they are AOT-compatible via source generators in .NET 9
[assembly: UnconditionalSuppressMessage("Trimming", "IL2026:Members annotated with 'RequiresUnreferencedCodeAttribute' require dynamic access", Justification = "Minimal APIs in .NET 9 are AOT-compatible via source generators")]
[assembly: UnconditionalSuppressMessage("AOT", "IL3050:Calling members annotated with 'RequiresDynamicCodeAttribute' may break functionality when AOT compiling", Justification = "Minimal APIs in .NET 9 are AOT-compatible via source generators")]
