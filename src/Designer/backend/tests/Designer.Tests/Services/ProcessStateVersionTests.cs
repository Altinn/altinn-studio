using System;
using System.IO;
using System.Text;
using Altinn.Studio.Designer.Services.Implementation.ProcessModeling;
using Xunit;

namespace Designer.Tests.Services;

public sealed class ProcessStateVersionTests : IDisposable
{
    private static readonly byte[] s_processDefinition = Encoding.UTF8.GetBytes("<definitions />");
    private readonly string _root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

    public ProcessStateVersionTests()
    {
        Write("App/ui/Task_1/Settings.json", "{}");
        Write("App/ui/Task_1/layouts/Side1.json", "{}");
        Write("App/ui/subform/Settings.json", "{}");
        Write("App/config/applicationmetadata.json", "{}");
        Write("App/config/authorization/policy.xml", "<policy />");
    }

    [Fact]
    public void Compute_IgnoresChangesInsideLayoutSetFolders()
    {
        string before = Version();

        Write("App/ui/Task_1/layouts/Side1.json", """{ "data": { "layout": [] } }""");
        Write("App/ui/Task_1/layouts/Side2.json", "{}");
        Write("App/ui/Task_1/Settings.json", """{ "pages": { "order": ["Side1", "Side2"] } }""");

        Assert.Equal(before, Version());
    }

    [Theory]
    [InlineData("renameLayoutSetFolder")]
    [InlineData("addLayoutSetFolder")]
    [InlineData("deleteLayoutSetFolder")]
    [InlineData("addLayoutSetsFile")]
    [InlineData("editApplicationMetadata")]
    [InlineData("editPolicy")]
    [InlineData("deletePolicy")]
    public void Compute_ChangesWhenADependencyChanges(string change)
    {
        string before = Version();

        switch (change)
        {
            case "renameLayoutSetFolder":
                Directory.Move(PathTo("App/ui/Task_1"), PathTo("App/ui/Task_2"));
                break;
            case "addLayoutSetFolder":
                Directory.CreateDirectory(PathTo("App/ui/Task_2"));
                break;
            case "deleteLayoutSetFolder":
                Directory.Delete(PathTo("App/ui/subform"), recursive: true);
                break;
            case "addLayoutSetsFile":
                Write("App/ui/layout-sets.json", "{}");
                break;
            case "editApplicationMetadata":
                Write("App/config/applicationmetadata.json", """{ "id": "ttd/app" }""");
                break;
            case "editPolicy":
                Write("App/config/authorization/policy.xml", "<policy><rule /></policy>");
                break;
            case "deletePolicy":
                File.Delete(PathTo("App/config/authorization/policy.xml"));
                break;
        }

        Assert.NotEqual(before, Version());
    }

    [Fact]
    public void Compute_IgnoresHiddenEntriesInTheUiFolder()
    {
        string before = Version();

        Write("App/ui/.DS_Store", "");
        Directory.CreateDirectory(PathTo("App/ui/.hidden"));

        Assert.Equal(before, Version());
    }

    [Fact]
    public void Compute_ChangesWhenTheProcessDefinitionChanges()
    {
        Assert.NotEqual(
            Version(),
            ProcessStateVersion.Compute(_root, Encoding.UTF8.GetBytes("<definitions id=\"changed\" />"))
        );
    }

    [Fact]
    public void Compute_TreatsSymbolicLinksLikeTheirTargets()
    {
        string before = Version();
        string target = Path.Combine(_root, "policy-target.xml");
        File.Move(PathTo("App/config/authorization/policy.xml"), target);
        File.CreateSymbolicLink(PathTo("App/config/authorization/policy.xml"), target);

        Assert.Equal(before, Version());

        File.Delete(target);
        string withBrokenLink = Version();
        File.Delete(PathTo("App/config/authorization/policy.xml"));

        Assert.Equal(Version(), withBrokenLink);
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private string Version() => ProcessStateVersion.Compute(_root, s_processDefinition);

    private string PathTo(string relativePath) => Path.Combine(_root, relativePath);

    private void Write(string relativePath, string content)
    {
        string path = PathTo(relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content);
    }
}
