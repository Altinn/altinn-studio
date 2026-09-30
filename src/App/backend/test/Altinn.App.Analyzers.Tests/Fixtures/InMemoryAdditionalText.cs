using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.App.Analyzers.Tests.Fixtures;

/// <summary>
/// An <see cref="AdditionalText"/> backed by an in-memory string, for testing analyzers/utilities
/// that read <c>applicationmetadata.json</c> without spinning up a full compilation.
/// </summary>
internal sealed class InMemoryAdditionalText : AdditionalText
{
    private readonly SourceText _text;

    public InMemoryAdditionalText(string path, string content)
    {
        Path = path;
        _text = SourceText.From(content);
    }

    public override string Path { get; }

    public override SourceText GetText(CancellationToken cancellationToken = default) => _text;
}
