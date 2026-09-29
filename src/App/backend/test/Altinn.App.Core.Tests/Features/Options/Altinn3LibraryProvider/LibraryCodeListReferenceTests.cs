using Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;

namespace Altinn.App.Core.Tests.Features.Options.Altinn3LibraryProvider;

public class LibraryCodeListReferenceTests
{
    [Theory]
    [InlineData("lib**ttd**SomeCodeListId**latest", "ttd", "SomeCodeListId", "latest")]
    [InlineData("lib**ttd**SomeCodeListId**1", "ttd", "SomeCodeListId", "1")]
    [InlineData("lib**digdir**PostalCodes**2.0", "digdir", "PostalCodes", "2.0")]
    [InlineData("lib**nav**CountryCodes**v1.5.3", "nav", "CountryCodes", "v1.5.3")]
    [InlineData("lib**skd**Municipalities**20231201", "skd", "Municipalities", "20231201")]
    [InlineData("lib**ttd**Code_List_With_Underscores**1.0", "ttd", "Code_List_With_Underscores", "1.0")]
    [InlineData("lib**ttd**code-list-with-dashes**2.0", "ttd", "code-list-with-dashes", "2.0")]
    [InlineData("lib**TTD**CodeListId**1.0", "TTD", "CodeListId", "1.0")]
    [InlineData("lib**Org123**CodeListId**1.0", "Org123", "CodeListId", "1.0")]
    public void Parses_a_well_formed_reference(string optionId, string org, string codeListId, string version)
    {
        Assert.True(LibraryCodeListReference.TryParse(optionId, out var definition));
        Assert.Equal(new LibraryCodeListDefinition(optionId, org, codeListId, version), definition);
    }

    [Theory]
    [InlineData("**ttd**CodeListId**1.0")] // Missing lib prefix
    [InlineData("lib****Municipalities**1")] // Missing org
    [InlineData("lib**ttd****1")] // Missing code list id
    [InlineData("lib**ttd**SomeCodeListId**")] // Missing version
    [InlineData("lib**ttd**CodeList With Space**1.0")] // Space in codeListId
    [InlineData("lib**tt d**CodeListId**1.0")] // Space in org
    [InlineData("lib**ttd**CodeListId**1 .0")] // Space in version
    [InlineData("lib**ttd-org**CodeListId**1.0")] // Dash in org, only alphanumeric allowed
    [InlineData("lib**ttd**CodeList@Id**1.0")] // Special char in codeListId
    [InlineData("lib**ttd**CodeListId**v1.0@")] // Special char in version
    [InlineData("libttd**CodeListId**1.0")] // Missing separator after lib
    [InlineData("lib**ttd**CodeListId*1.0")] // Wrong number of asterisks before version
    [InlineData("lib**ttd**CodeListId**1.0**extra")] // Too many segments
    [InlineData("SomeCodeListId")] // A plain option id
    public void Rejects_anything_else(string optionId)
    {
        Assert.False(LibraryCodeListReference.TryParse(optionId, out var definition));
        Assert.Null(definition);
    }
}
