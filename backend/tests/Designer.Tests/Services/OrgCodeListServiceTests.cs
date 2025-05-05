using System;
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

public class OrgCodeListServiceTests : IDisposable
{
    private string _targetOrg { get; set; }

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

        _targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(_targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, _targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        var fetchedCodeLists = await service.GetCodeLists(_targetOrg, Developer);
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

        const string CodeListId = "newCoodeList";
        _targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(_targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, _targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        var codeListData = await service.CreateCodeList(_targetOrg, Developer, CodeListId, newCodeList);
        List<Option> codeList = codeListData.Find(e => e.Title == CodeListId).Data;

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
        const string CodeListId = "codeListTrailingComma";
        _targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(_targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, _targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        var codeListData = await service.UpdateCodeList(_targetOrg, Developer, CodeListId, newCodeList);
        List<Option> codeList = codeListData.Find(e => e.Title == CodeListId).Data;

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

    [Fact]
    public async Task UploadCodeList_ShouldReturnAllCodeListsAfterUploading()
    {
        // Arrange
        const string CodeListId = "newCodeList";
        const string FileName = $"{CodeListId}.json";
        const string JsonCodeList = @"[
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
        byte[] codeListBytes = Encoding.UTF8.GetBytes(JsonCodeList);
        var stream = new MemoryStream(codeListBytes);
        IFormFile file = new FormFile(stream, 0, codeListBytes.Length, FileName, FileName);

        _targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(_targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, _targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        var codeListData = await service.UploadCodeList(_targetOrg, Developer, file);
        stream.Close();
        List<Option> codeList = codeListData.Find(e => e.Title == CodeListId).Data;

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

    [Fact]
    public async Task DeleteCodeList_ShouldReturnAllCodeListsAfterDeletion()
    {
        // Arrange
        const string CodeListId = "codeListNumber";
        _targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(_targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, _targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        var codeListData = await service.DeleteCodeList(_targetOrg, Developer, CodeListId);

        // Assert
        Assert.Equal(5, codeListData.Count);
    }

    [Fact]
    public async Task DeleteCodeList_ShouldThrowExceptionIfCodeListDoesNotExist()
    {
        // Arrange
        const string CodeListId = "codeListWhichDoesNotExist";
        _targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(_targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, _targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act and assert
        await Assert.ThrowsAsync<LibGit2Sharp.NotFoundException>(async () => await service.DeleteCodeList(_targetOrg, Developer, CodeListId));
    }

    [Fact]
    public async Task CodeListExists_ShouldReturnTrue_WhenCodeListExists()
    {
        // Arrange
        const string CodeListId = "codeListNumber";
        _targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(_targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, _targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        bool codeListExists = await service.CodeListExists(_targetOrg, Developer, CodeListId);

        // Assert
        Assert.True(codeListExists);
    }

    [Fact]
    public async Task CodeListExists_ShouldReturnFalse_WhenCodeListDoesNotExists()
    {
        // Arrange
        const string CodeListId = "codeListWhichDoesNotExist";
        _targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(_targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, _targetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        bool codeListExists = await service.CodeListExists(_targetOrg, Developer, CodeListId);

        // Assert
        Assert.False(codeListExists);
    }

    [Fact]
    public async Task GetCodeListIds_ShouldReturnListOfCodeListIds_WhenCodeListsExists()
    {
        // Arrange
        _targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(_targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, _targetOrg, targetRepo);
        var service = GetOrgCodeListService();

        // Act
        List<string> codeListIds = service.GetCodeListIds(_targetOrg, Developer);

        // Assert
        Assert.Equal(6, codeListIds.Count);
    }

    [Fact]
    public async Task GetCodeListIds_ShouldReturnEmptyList_WhenCodeListDoesNotExist()
    {
        // Arrange
        const string EmptyRepo = "org-content-empty";
        _targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(_targetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, EmptyRepo, _targetOrg, targetRepo);
        var service = GetOrgCodeListService();

        // Act
        List<string> codeListIds = service.GetCodeListIds(_targetOrg, Developer);

        // Assert
        Assert.Empty(codeListIds);
    }

    private static OrgCodeListService GetOrgCodeListService()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory =
            new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        OrgCodeListService service = new(altinnGitRepositoryFactory);

        return service;
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(_targetOrg))
        {
            TestDataHelper.DeleteOrgDirectory(Developer, _targetOrg);
        }
    }
}
