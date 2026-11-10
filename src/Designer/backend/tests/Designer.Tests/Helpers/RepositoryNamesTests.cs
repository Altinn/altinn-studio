using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Xunit;

namespace Designer.Tests.Helpers;

public class RepositoryNamesTests
{
    [Fact]
    public void Names_AppendTheSharedRepositorySuffixesToTheOwner()
    {
        Assert.Equal("ttd-datamodels", RepositoryNames.DataModels("ttd"));
        Assert.Equal("ttd-content", RepositoryNames.Content("ttd"));
        Assert.Equal("ttd-resources", RepositoryNames.Resources("ttd"));
    }

    [Theory]
    [InlineData("ttd", "ttd-datamodels", RepositoryKind.DataModels)]
    [InlineData("ttd", "ttd-content", RepositoryKind.Content)]
    [InlineData("ttd", "ttd-resources", RepositoryKind.Resources)]
    [InlineData("TTD", "ttd-Resources", RepositoryKind.Resources)]
    [InlineData("ttd", "hvem-er-hvem", RepositoryKind.App)]
    public void KindOf_ReturnsTheKindForTheFullName(string owner, string repository, RepositoryKind expected)
    {
        Assert.Equal(expected, RepositoryNames.KindOf(owner, repository));
    }

    [Theory]
    [InlineData("ttd", "my-app-datamodels")]
    [InlineData("ttd", "ttd-datamodels-test")]
    [InlineData("ttd", "skd-content")]
    [InlineData("ttd", "test-ttd-resources")]
    public void KindOf_NameThatOnlyContainsASharedRepositoryName_IsAnApp(string owner, string repository)
    {
        Assert.Equal(RepositoryKind.App, RepositoryNames.KindOf(owner, repository));
    }
}
