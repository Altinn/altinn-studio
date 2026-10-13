namespace Altinn.Studio.Assistant.Runner.Tests;

public sealed class JobUserTests
{
    private const int JobUid = 999;

    private static readonly JobUser _user = new(JobUid, JobUid);

    [Fact]
    public void Command_RunsThroughSetprivAsTheJobUserInTheFolder()
    {
        var startInfo = _user.CreateStartInfo(["dotnet", "build"], "/work/job/app", new Dictionary<string, string>());

        Assert.Equal("setpriv", startInfo.FileName);
        Assert.Equal(
            [
                "--reuid=999",
                "--regid=999",
                "--clear-groups",
                "--no-new-privs",
                "--",
                "env",
                "--chdir=/work/job/app",
                "--",
                "dotnet",
                "build",
            ],
            startInfo.ArgumentList
        );
    }

    [Fact]
    public void Command_GetsOnlyTheGivenEnvironment()
    {
        Assert.NotEmpty(Environment.GetEnvironmentVariables().Keys);

        var startInfo = _user.CreateStartInfo(
            ["true"],
            "/",
            new Dictionary<string, string> { ["HOME"] = "/work/job/home" }
        );

        var variable = Assert.Single(startInfo.Environment);
        Assert.Equal("HOME", variable.Key);
        Assert.Equal("/work/job/home", variable.Value);
    }

    [Theory]
    [InlineData("S (sleeping)", "999\t999\t999\t999", true)]
    [InlineData("R (running)", "1000\t999\t999\t999", true)]
    [InlineData("Z (zombie)", "999\t999\t999\t999", false)]
    [InlineData("X (dead)", "999\t999\t999\t999", false)]
    [InlineData("S (sleeping)", "0\t0\t0\t0", false)]
    public void ProcessStatus_TellsIfTheJobUserHasALiveProcess(string state, string uids, bool isLive)
    {
        var status =
            $"Name:\tsleep\nUmask:\t0022\nState:\t{state}\nTgid:\t42\nUid:\t{uids}\nGid:\t999\t999\t999\t999\n";

        Assert.Equal(isLive, JobUser.IsLiveProcessOf(status, JobUid));
    }
}
