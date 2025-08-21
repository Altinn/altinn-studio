namespace Altinn.App.Analyzers.Tests.Fixtures;

internal sealed record DocumentSelector
{
    public DocumentSelector(params string[] path)
    {
        FilePath = Path.Join([Directory.GetCurrentDirectory(), "testapp", "App", .. path]);
    }

    public string FilePath { get; }

    public override string ToString() => FilePath;
}

partial class AltinnTestAppFixture
{
    static class Content
    {
        public static readonly DocumentSelector ApplicationMetadata = new DocumentSelector(
            "config",
            "applicationmetadata.json"
        );
        public static readonly DocumentSelector LayoutSets = new DocumentSelector("ui", "layout-sets.json");
        public static readonly DocumentSelector ModelClass = new DocumentSelector("models", "model.cs");

        public static readonly DocumentSelector InvalidHttpContextAccessorUse = new DocumentSelector(
            "additional",
            "InvalidHttpContextAccessorUse.cs"
        );
    }
}
