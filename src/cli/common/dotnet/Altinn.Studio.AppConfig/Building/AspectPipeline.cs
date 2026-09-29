using Altinn.Studio.AppConfig.CSharp;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Parsers;

namespace Altinn.Studio.AppConfig.Building;

internal sealed class AspectPipeline
{
    private static readonly IReadOnlyList<Aspect> _aspects = new List<Aspect>
    {
        new("metadata", MetadataParser.Parse),
        new("process", ProcessParser.Parse),
        new("policy", PolicyParser.Parse),
        new("texts", TextResourcesParser.Parse),
        new("datamodel", SchemaParser.Parse),
        new("options", OptionsParser.Parse),
        new("footer", FooterParser.Parse),
        new("layoutsets", (m, d) => LayoutSetsParser.Parse(m, d, parseLayouts: false)),
        new("csharp", (m, d) => new RoslynSyntaxIntrospector().Introspect(m, d)),
    };

    public IReadOnlyList<Aspect> Aspects => _aspects;
}

internal sealed record Aspect(string Name, Action<AppModelBuilder, IAppDirectory> Parse);
