namespace Altinn.Studio.AppConfig.Documents.Text;

public readonly record struct SourceSpan(
    string File,
    string Pointer,
    int Line = 0,
    int Column = 0,
    int EndLine = 0,
    int EndColumn = 0,
    bool Key = false
)
{
    public override string ToString() => string.IsNullOrEmpty(Pointer) ? File : File + "#" + Pointer;

    public SourceSpan Child(string segment) => new(File, Pointer + "/" + segment);

    public SourceSpan Child(int index) => new(File, Pointer + "/" + index);
}
