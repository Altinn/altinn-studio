namespace Altinn.Studio.StudioctlServer.Tests.Upgrade;

public sealed class FakeAppProjectFixtureTests
{
    [Fact]
    public void Create_WritesV8AppProjectLayout()
    {
        using var fixture = new FakeAppProjectFixture();

        var app = fixture.Create(FakeAppSourceVersion.V8);

        Assert.True(Directory.Exists(app.RootDirectory));
        Assert.True(File.Exists(app.ProjectFile));
        Assert.True(File.Exists(app.ProgramFile));
        Assert.True(File.Exists(app.ProcessFile));
        Assert.True(File.Exists(app.ApplicationMetadataFile));
        Assert.True(Directory.Exists(app.UiDirectory));
        Assert.True(Directory.Exists(app.TextsDirectory));
        Assert.Contains("Version=\"8.0.0\"", File.ReadAllText(app.ProjectFile));
        Assert.Contains("<TargetFramework>net8.0</TargetFramework>", File.ReadAllText(app.ProjectFile));
    }

    [Fact]
    public void Create_WritesV7AppProjectLayout()
    {
        using var fixture = new FakeAppProjectFixture();

        var app = fixture.Create(FakeAppSourceVersion.V7);

        Assert.Contains("Version=\"7.0.0\"", File.ReadAllText(app.ProjectFile));
        Assert.Contains("<TargetFramework>net6.0</TargetFramework>", File.ReadAllText(app.ProjectFile));
    }

    [Fact]
    public void Create_WritesCustomProgramCs()
    {
        using var fixture = new FakeAppProjectFixture();

        var app = fixture.Create(FakeAppSourceVersion.V8, "using Microsoft.OpenApi.Models;" + Environment.NewLine);

        Assert.Equal("using Microsoft.OpenApi.Models;" + Environment.NewLine, File.ReadAllText(app.ProgramFile));
    }
}
