using System.Diagnostics.CodeAnalysis;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Altinn.App.Analyzers.Tests.Fixtures;

/// <summary>
/// Analyzer options for a compilation made in memory, which set <c>IsAltinnApp</c> the way an app's build does, so
/// the analyzers that only analyze apps run.
/// </summary>
internal sealed class AltinnAppOptionsProvider(bool isAltinnApp) : AnalyzerConfigOptionsProvider
{
    private readonly Options _options = new(isAltinnApp);

    public override AnalyzerConfigOptions GlobalOptions => _options;

    public override AnalyzerConfigOptions GetOptions(SyntaxTree tree) => _options;

    public override AnalyzerConfigOptions GetOptions(AdditionalText textFile) => _options;

    private sealed class Options(bool isAltinnApp) : AnalyzerConfigOptions
    {
        public override bool TryGetValue(string key, [NotNullWhen(true)] out string? value)
        {
            value = isAltinnApp && key == "build_property.IsAltinnApp" ? "true" : null;
            return value is not null;
        }
    }
}
