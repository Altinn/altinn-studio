using LocalTest.Models;
using Xunit;

namespace LocalTest.Tests.Home;

public class StartAppModelTests
{
    [Fact]
    public void SelectRememberedApp_PreselectsTheAppWhenItIsRunning()
    {
        var model = ModelWithApps("ttd/first", "ttd/second");

        model.SelectRememberedApp("ttd/second");

        Assert.Equal("ttd/second", model.AppPathSelection);
        Assert.Equal("ttd/second", Assert.Single(model.TestApps, app => app.Selected).Value);
    }

    [Fact]
    public void SelectRememberedApp_LeavesTheChoiceAloneWhenTheAppIsNotRunning()
    {
        var model = ModelWithApps("ttd/first", "ttd/second");

        model.SelectRememberedApp("ttd/gone");

        Assert.Null(model.AppPathSelection);
        Assert.DoesNotContain(model.TestApps, app => app.Selected);
    }

    [Fact]
    public void SelectRememberedApp_DoesNotOverrideAnAppAlreadySelected()
    {
        var model = ModelWithApps("ttd/first", "ttd/second");
        model.TestApps[0].Selected = true;

        model.SelectRememberedApp("ttd/second");

        Assert.Equal("ttd/first", Assert.Single(model.TestApps, app => app.Selected).Value);
    }

    private static StartAppModel ModelWithApps(params string[] paths) =>
        new()
        {
            TestApps = paths.Select(path => new AppSelectionOption { Value = path, Text = path }).ToList(),
        };
}
