using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Altinn.App.Analyzers.Tests.Fixtures;

/// <summary>
/// Builds <see cref="AnalyzerOptions"/> for analyzers gated on the <c>IsAltinnApp</c> compiler-visible
/// property (which the packaged <c>Altinn.App.Api.props</c> sets in real apps but a test compilation
/// does not), optionally with in-memory <see cref="AdditionalText"/> files.
/// </summary>
internal static class AltinnAppAnalyzerOptions
{
    public static AnalyzerOptions Create(params AdditionalText[] additionalFiles) =>
        new AnalyzerOptions([.. additionalFiles], new OptionsProvider());

    private sealed class OptionsProvider : AnalyzerConfigOptionsProvider
    {
        public override AnalyzerConfigOptions GlobalOptions { get; } =
            new Options(
                new Dictionary<string, string> { ["build_property.IsAltinnApp"] = "true" }.ToImmutableDictionary()
            );

        public override AnalyzerConfigOptions GetOptions(SyntaxTree tree) =>
            new Options(ImmutableDictionary<string, string>.Empty);

        public override AnalyzerConfigOptions GetOptions(AdditionalText textFile) =>
            new Options(ImmutableDictionary<string, string>.Empty);
    }

    private sealed class Options : AnalyzerConfigOptions
    {
        private readonly ImmutableDictionary<string, string> _values;

        public Options(ImmutableDictionary<string, string> values) => _values = values;

        public override bool TryGetValue(string key, out string value) => _values.TryGetValue(key, out value!);
    }
}
