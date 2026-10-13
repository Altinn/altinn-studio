using System.Text;

namespace Altinn.Studio.Assistant.Runner.Tests;

public sealed class JobRunnerTests
{
    private const string JobFolder = "/work/0123456789abcdef";

    [Fact]
    public void JobEnvironment_HasNoVariableOfTheService()
    {
        var user = new JobUser(999, 999);

        var startInfo = user.CreateStartInfo(["true"], JobFolder, JobRunner.CreateEnvironment(JobFolder));

        Assert.Equal(
            [
                "DOTNET_CLI_TELEMETRY_OPTOUT",
                "DOTNET_GENERATE_ASPNET_CERTIFICATE",
                "DOTNET_NOLOGO",
                "DOTNET_SKIP_WORKLOAD_INTEGRITY_CHECK",
                "GIT_AUTHOR_EMAIL",
                "GIT_AUTHOR_NAME",
                "GIT_COMMITTER_EMAIL",
                "GIT_COMMITTER_NAME",
                "GIT_CONFIG_NOSYSTEM",
                "HOME",
                "MSBUILDDISABLENODEREUSE",
                "NO_COLOR",
                "NUGET_PACKAGES",
                "NUGET_XMLDOC_MODE",
                "PATH",
                "STUDIOCTL_HOME",
                "STUDIOCTL_NO_UPDATE_CHECK",
                "TMPDIR",
            ],
            startInfo.Environment.Keys.Order(StringComparer.Ordinal)
        );
    }

    [Fact]
    public void JobEnvironment_KeepsTheStateOfTheJobInTheJobFolder()
    {
        var environment = JobRunner.CreateEnvironment(JobFolder);

        Assert.Equal($"{JobFolder}/home", environment["HOME"]);
        Assert.Equal($"{JobFolder}/tmp", environment["TMPDIR"]);
        Assert.Equal($"{JobFolder}/home/.nuget/packages", environment["NUGET_PACKAGES"]);
        Assert.Equal($"{JobFolder}/studioctl", environment["STUDIOCTL_HOME"]);
    }

    [Fact]
    public async Task OutputAboveTheLimit_IsCutAndReadToTheEnd()
    {
        using var stream = new MemoryStream(new byte[JobRunner.MaxStreamBytes + 10]);

        var output = await JobRunner.ReadAtMostAsync(stream, JobRunner.MaxStreamBytes);

        Assert.Equal(JobRunner.MaxStreamBytes, output.Bytes.Length);
        Assert.True(output.IsCut);
        Assert.Equal(stream.Length, stream.Position);
    }

    [Fact]
    public async Task OutputAtTheLimit_IsNotCut()
    {
        using var stream = new MemoryStream(new byte[JobRunner.MaxStreamBytes]);

        var output = await JobRunner.ReadAtMostAsync(stream, JobRunner.MaxStreamBytes);

        Assert.Equal(JobRunner.MaxStreamBytes, output.Bytes.Length);
        Assert.False(output.IsCut);
    }

    [Fact]
    public void Paths_AreRelativeToTheApp()
    {
        var output = new JobRunner.CutOutput(
            Encoding.UTF8.GetBytes(
                $"{JobFolder}/app/App/Program.cs(3,1): error CS1002 [{JobFolder}/app/App/App.csproj]"
            ),
            false
        );

        Assert.Equal("App/Program.cs(3,1): error CS1002 [App/App.csproj]", JobRunner.ToAppText(output, JobFolder));
    }

    [Fact]
    public void CutOutput_TellsThatItIsCut()
    {
        var output = new JobRunner.CutOutput(Encoding.UTF8.GetBytes("Build started"), true);

        Assert.Equal("Build started\n[The runner cut this output here.]", JobRunner.ToAppText(output, JobFolder));
    }
}
