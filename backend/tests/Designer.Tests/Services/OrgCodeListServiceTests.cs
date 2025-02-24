using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation.Organisation;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Designer.Tests.Services;

public class OrgCodeListServiceTests
{
    private const string Org = "ttd";
    private const string Repo = "org-content";
    private const string Developer = "testUser";

    [Fact]
    public async Task GetCodeLists_ShouldReturnAllCodeLists()
    {
        // Arrange
        List<Option> expectedCodeList = new()
        {
            new Option
            {
                Label = "En",
                Value = 1.05
            },
            new Option
            {
                Label = "To",
                Value = 2.01
            },
            new Option
            {
                Label = "Tre",
                Value = 3.1
            }
        };

        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        try
        {
            // Act
            var fetchedCodeLists = await service.GetCodeLists(targetOrg, Developer);
            List<Option> fetchedCodeListData = fetchedCodeLists.Find(e => e.Title == "codeListNumber").Data;

            // Assert
            Assert.Equal(expectedCodeList.Count, fetchedCodeListData?.Count);

            for (int i = 0; i < fetchedCodeListData?.Count; i++)
            {
                Assert.Equal(expectedCodeList[i].Label, fetchedCodeListData[i].Label);
                Assert.Equal(expectedCodeList[i].Value, fetchedCodeListData[i].Value);
                Assert.Equal(expectedCodeList[i].Description, fetchedCodeListData[i].Description);
                Assert.Equal(expectedCodeList[i].HelpText, fetchedCodeListData[i].HelpText);
            }
        }
        finally
        {
            TestDataHelper.DeleteOrgDirectory(Developer, targetOrg);
        }
    }

    [Fact]
    public async Task CreateCodeList_ShouldReturnAllCodeListsAfterCreation()
    {
        // Arrange
        List<Option> newCodeList = new()
        {
            new Option
            {
                Label = "label1",
                Value = "value1"
            },
            new Option
            {
                Label = "label2",
                Value = "value2"
            }
        };

        const string codeListId = "newCoodeList";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        try
        {
            // Act
            var codeListData = await service.CreateCodeList(targetOrg, Developer, codeListId, newCodeList);
            List<Option> codeList = codeListData.Find(e => e.Title == codeListId).Data;

            // Assert
            Assert.Equal(7, codeListData.Count);
            Assert.Equal(newCodeList.Count, codeList?.Count);

            for (int i = 0; i < codeList?.Count; i++)
            {
                Assert.Equal(newCodeList[i].Label, codeList[i].Label);
                Assert.Equal(newCodeList[i].Value, codeList[i].Value);
                Assert.Equal(newCodeList[i].Description, codeList[i].Description);
                Assert.Equal(newCodeList[i].HelpText, codeList[i].HelpText);
            }
        }
        finally
        {
            TestDataHelper.DeleteOrgDirectory(Developer, targetOrg);
        }
    }

    [Fact]
    public async Task UpdateCodeList_ShouldReturnAllCodeListAfterUpdate()
    {
        // Arrange
        List<Option> newCodeList = new()
        {
            new Option
            {
                Label = "someLabel",
                Value = "Updated value"
            }
        };
        const string codeListId = "codeListTrailingComma";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        try
        {
            // Act
            var codeListData = await service.UpdateCodeList(targetOrg, Developer, codeListId, newCodeList);
            List<Option> codeList = codeListData.Find(e => e.Title == codeListId).Data;

            // Assert
            Assert.Equal(6, codeListData.Count);
            Assert.Equal(newCodeList.Count, codeList?.Count);

            for (int i = 0; i < codeList?.Count; i++)
            {
                Assert.Equal(newCodeList[i].Label, codeList[i].Label);
                Assert.Equal(newCodeList[i].Value, codeList[i].Value);
                Assert.Equal(newCodeList[i].Description, codeList[i].Description);
                Assert.Equal(newCodeList[i].HelpText, codeList[i].HelpText);
            }
        }
        finally
        {
            TestDataHelper.DeleteOrgDirectory(Developer, targetOrg);
        }
    }

    [Fact]
    public async Task UploadCodeList_ShouldReturnAllCodeListsAfterUploading()
    {
        // Arrange
        const string codeListId = "newCodeList";
        const string fileName = $"{codeListId}.json";
        const string jsonCodeList = @"[
            {""label"": ""someLabel"",""value"": ""someValue"" },
        ]";
        List<Option> expectedCodeList = new()
        {
            new Option
            {
                Label = "someLabel",
                Value = "someValue"
            }
        };
        IFormFile file = CreateTestFile(jsonCodeList, fileName);
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        try
        {
            // Act
            var codeListData = await service.UploadCodeList(targetOrg, Developer, file);
            List<Option> codeList = codeListData.Find(e => e.Title == codeListId).Data;

            // Assert
            Assert.Equal(7, codeListData.Count);
            Assert.Equal(expectedCodeList.Count, codeList?.Count);

            for (int i = 0; i < codeList?.Count; i++)
            {
                Assert.Equal(expectedCodeList[i].Label, codeList[i].Label);
                Assert.Equal(expectedCodeList[i].Value, codeList[i].Value);
                Assert.Equal(expectedCodeList[i].Description, codeList[i].Description);
                Assert.Equal(expectedCodeList[i].HelpText, codeList[i].HelpText);
            }
        }
        finally
        {
            TestDataHelper.DeleteOrgDirectory(Developer, targetOrg);
        }
    }

    [Fact]
    public async Task DeleteCodeList_ShouldReturnAllCodeListsAfterDeletion()
    {
        // Arrange
        const string codeListId = "codeListNumber";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        try
        {
            // Act
            var codeListData = await service.DeleteCodeList(targetOrg, Developer, codeListId);

            // Assert
            Assert.Equal(5, codeListData.Count);
        }
        finally
        {
            TestDataHelper.DeleteOrgDirectory(Developer, targetOrg);
        }
    }

    [Fact]
    public async Task DeleteCodeList_ShouldThrowExceptionIfCodeListDoesNotExist()
    {
        // Arrange
        const string codeListId = "codeListWhichDoesNotExist";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        try
        {
            // Act and assert
            await Assert.ThrowsAsync<LibGit2Sharp.NotFoundException>(async () =>
                await service.DeleteCodeList(targetOrg, Developer, codeListId));
        }
        finally
        {
            TestDataHelper.DeleteOrgDirectory(Developer, targetOrg);
        }
    }

    [Fact]
    public async Task CodeListExists_ShouldReturnTrue_WhenCodeListExists()
    {
        // Arrange
        const string codeListId = "codeListNumber";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        try
        {
            // Act
            bool codeListExists = await service.CodeListExists(targetOrg, Developer, codeListId);

            // Assert
            Assert.True(codeListExists);
        }
        finally
        {
            TestDataHelper.DeleteOrgDirectory(Developer, targetOrg);
        }
    }

    [Fact]
    public async Task CodeListExists_ShouldReturnFalse_WhenCodeListDoesNotExists()
    {
        // Arrange
        const string codeListId = "codeListWhichDoesNotExist";
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        try
        {
            // Act
            bool codeListExists = await service.CodeListExists(targetOrg, Developer, codeListId);

            // Assert
            Assert.False(codeListExists);
        }
        finally
        {
            TestDataHelper.DeleteOrgDirectory(Developer, targetOrg);
        }
    }

    private static OrgCodeListService GetOrgCodeListService()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory =
            new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        OrgCodeListService service = new(altinnGitRepositoryFactory);

        return service;
    }

    private static IFormFile CreateTestFile(string stringContent, string fileName)
    {
        byte[] codeListBytes = Encoding.UTF8.GetBytes(stringContent);
        var stream = new MemoryStream(codeListBytes);
        IFormFile file = new FormFile(stream, 0, codeListBytes.Length, fileName, fileName);
        return file;
    }
}
