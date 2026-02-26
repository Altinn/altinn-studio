using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.App.SourceGenerator.Tests;

public sealed class AdditionalTextImplementation : AdditionalText
{
    private readonly string? _text;

    public AdditionalTextImplementation(string? text, string filePath)
    {
        _text = text;
        Path = filePath;
    }

    public override SourceText? GetText(CancellationToken cancellationToken = default)
    {
        return _text != null ? SourceText.From(_text, Encoding.UTF8) : null;
    }

    public override string Path { get; }
}
