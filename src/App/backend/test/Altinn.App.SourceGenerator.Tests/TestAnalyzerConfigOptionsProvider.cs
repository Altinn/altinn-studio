using System.Diagnostics.CodeAnalysis;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Altinn.App.SourceGenerator.Tests;

internal sealed class TestAnalyzerConfigOptionsProvider(bool isAltinnApp = true) : AnalyzerConfigOptionsProvider
{
    private readonly TestGlobalOptions _options = new(isAltinnApp);

    public override AnalyzerConfigOptions GlobalOptions => _options;

    public override AnalyzerConfigOptions GetOptions(SyntaxTree tree) => _options;

    public override AnalyzerConfigOptions GetOptions(AdditionalText textFile) => _options;

    private sealed class TestGlobalOptions(bool isAltinnApp) : AnalyzerConfigOptions
    {
        public override bool TryGetValue(string key, [NotNullWhen(true)] out string? value)
        {
            if (key == "build_property.IsAltinnApp" && isAltinnApp)
            {
                value = "true";
                return true;
            }
            value = null;
            return false;
        }
    }
}
