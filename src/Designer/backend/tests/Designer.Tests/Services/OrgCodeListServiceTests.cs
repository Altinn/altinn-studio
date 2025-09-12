using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Implementation.Organisation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class OrgCodeListServiceTests : IDisposable
{
    private string TargetOrg { get; set; }

    private const string Org = "ttd";
    private const string Repo = "org-content";
    private const string Developer = "testUser";
    private Mock<IGitea> _giteaApiWrapperMock;
    private GiteaContentLibraryService _giteaContentLibraryService;

    public OrgCodeListServiceTests()
    {
        _giteaApiWrapperMock = new Mock<IGitea>();
        _giteaContentLibraryService = new GiteaContentLibraryService(_giteaApiWrapperMock.Object);
    }

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

        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        var fetchedCodeLists = await service.GetCodeLists(TargetOrg, Developer);
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
    public void PrepareFileDeleteContexts()
    {
        // Arrange
        const string Title = "irrelevant";
        CodeList codeList = SetupCodeList();
        List<CodeListWrapper> toDelete = [new()
        {
            Title = Title,
            CodeList = codeList,
            HasError = false,
        }];
        Dictionary<string, string> fileMetadata = new() { { Title, "non-descriptive-sha"} };

        // Act
        List<FileOperationContext> result = OrgCodeListService.PrepareFileDeletions(toDelete, fileMetadata);

        FileOperation expectedOperation = FileOperation.Delete;
        string expectedSha = fileMetadata[Title];

        // Assert
        Assert.NotEmpty(result);
        Assert.Equal(expectedOperation, result.FirstOrDefault()?.Operation);
        Assert.Equal(expectedSha, result.FirstOrDefault()?.Sha);
        Assert.Contains(Title, result.FirstOrDefault()?.Path);
    }

    [Fact]
    public void PrepareFileUpdateContexts()
    {
        // Arrange
        const string Title = "irrelevant";
        CodeList codeList = SetupCodeList();
        List<CodeListWrapper> toUpdate = [new()
        {
            Title = Title,
            CodeList = codeList,
            HasError = false,
        }];
        Dictionary<string, string> fileMetadata = new() { { Title, "non-descriptive-sha" } };

        // Act
        OrgCodeListService orgListService = GetOrgCodeListService();
        List<FileOperationContext> result = orgListService.PrepareFileUpdates(toUpdate, fileMetadata);

        FileOperation expectedOperation = FileOperation.Update;
        string expectedSha = fileMetadata[Title];

        byte[] resultAsBytes = Convert.FromBase64String(result.FirstOrDefault()?.Content);
        CodeList actualCodelist = System.Text.Json.JsonSerializer.Deserialize<CodeList>(resultAsBytes);

        // Assert
        Assert.NotEmpty(result);
        Assert.Equal(expectedOperation, result.FirstOrDefault()?.Operation);
        Assert.Equal(expectedSha, result.FirstOrDefault()?.Sha);
        Assert.Contains(Title, result.FirstOrDefault()?.Path);
        Assert.Equivalent(codeList, actualCodelist, strict: true);
    }

    [Fact]
    public void PrepareFileCreations()
    {
        // Arrange
        const string Title = "irrelevant";
        CodeList codeList = SetupCodeList();
        List<CodeListWrapper> toUpdate = [new()
        {
            Title = Title,
            CodeList = codeList,
            HasError = false,
        }];

        // Act
        OrgCodeListService orgListService = GetOrgCodeListService();
        List<FileOperationContext> result = orgListService.PrepareFileCreations(toUpdate);

        FileOperation expectedOperation = FileOperation.Create;
        string expectedSha = null;

        byte[] resultAsBytes = Convert.FromBase64String(result.FirstOrDefault()?.Content);
        CodeList actualCodelist = System.Text.Json.JsonSerializer.Deserialize<CodeList>(resultAsBytes);

        // Assert
        Assert.NotEmpty(result);
        Assert.Equal(expectedOperation, result.FirstOrDefault()?.Operation);
        Assert.Equal(expectedSha, result.FirstOrDefault()?.Sha);
        Assert.Contains(Title, result.FirstOrDefault()?.Path);
        Assert.Equivalent(codeList, actualCodelist, strict: true);
    }

    [Fact]
    public void ExtractContentFromFiles()
    {
        // Arrange
        string fosWithContentName = "hascontent";
        string fosWithoutContentName = "nocontent";

        CodeList validCodeList = SetupCodeList();
        List<FileSystemObject> remoteFiles =
        [
            new FileSystemObject
            {
                Name = fosWithContentName,
                Path = $"CodeLists/{fosWithContentName}.json",
                Content = System.Text.Json.JsonSerializer.Serialize(validCodeList),
                Sha = "non-descriptive-sha-1"
            },
            new FileSystemObject
            {
                Name = fosWithoutContentName,
                Path = $"CodeLists/{fosWithoutContentName}.json",
                Content = null,
                Sha = "non-descriptive-sha-2"
            }
        ];

        // Act
        (List<CodeListWrapper> result, Dictionary<string, string> fileMetadata) = OrgCodeListService.ExtractContentFromFiles(remoteFiles);

        // Assert
        Assert.NotEmpty(result);
        Assert.Equal(2, result.Count);
        Assert.Single(fileMetadata);
        Assert.True(result.First(csw => csw.Title == fosWithoutContentName).HasError);
        Assert.False(result.First(csw => csw.Title == fosWithContentName).HasError);
    }

    [Fact]
    public void CreateFileChangeContexts()
    {
        // Arrange
        string shouldResolveToUpdateOperation = "shouldResolveToUpdateOperation";
        string shouldResolveToDeleteOperation = "shouldResolveToDeleteOperation";
        string shouldResolveToCreateOperation = "shouldResolveToCreateOperation";
        var codeListWrappers = new List<CodeListWrapper>
        {
            new()
            {
                Title = shouldResolveToUpdateOperation,
                CodeList = SetupCodeList(),
                HasError = false
            },
            new()
            {
                Title = shouldResolveToDeleteOperation,
                HasError = false
            },
            new()
            {
                Title = shouldResolveToCreateOperation,
                CodeList = SetupCodeList(),
                HasError = false
            }
        };
        var existingFiles = new List<FileSystemObject>
        {
            new()
            {
                Name = shouldResolveToUpdateOperation,
                Path = $"CodeLists/{shouldResolveToUpdateOperation}.json",
                Encoding = "base64",
                Content = System.Text.Json.JsonSerializer.Serialize(SetupCodeList()),
                Sha = "non-descriptive-sha-1",
                Type = "file"
            },
            new()
            {
                Name = shouldResolveToDeleteOperation,
                Path = $"CodeLists/{shouldResolveToDeleteOperation}.json",
                Encoding = "base64",
                Content = System.Text.Json.JsonSerializer.Serialize(SetupCodeList()),
                Sha = "non-descriptive-sha-2",
                Type = "file"
            }
        };

        // Act
        OrgCodeListService orgListService = GetOrgCodeListService();
        List<FileOperationContext> result = orgListService.CreateFileChangeContexts(codeListWrappers, existingFiles);

        FileOperationContext updateOperation = result.FirstOrDefault(fo => fo.Path == $"CodeLists/{shouldResolveToUpdateOperation}.json");
        FileOperationContext deleteOperation = result.FirstOrDefault(fo => fo.Path == $"CodeLists/{shouldResolveToDeleteOperation}.json");
        FileOperationContext createOperation = result.FirstOrDefault(fo => fo.Path == $"CodeLists/{shouldResolveToCreateOperation}.json");


        // Assert
        Assert.Equal(3, result.Count);
        Assert.NotNull(updateOperation);
        Assert.NotNull(updateOperation.Sha);
        Assert.NotNull(updateOperation.Content);
        Assert.Equal(FileOperation.Update, updateOperation.Operation);

        Assert.NotNull(deleteOperation);
        Assert.NotNull(deleteOperation.Sha);
        Assert.Null(deleteOperation.Content);
        Assert.Equal(FileOperation.Delete, deleteOperation.Operation);

        Assert.NotNull(createOperation);
        Assert.Null(createOperation.Sha);
        Assert.NotNull(createOperation.Content);
        Assert.Equal(FileOperation.Create, createOperation.Operation);
    }

    [Fact]
    public async Task UpdateCodeLists()
    {
        // Arrange
        CodeList validCodeList = SetupCodeList();
        List<CodeListWrapper> localCodeListWrappers = [
            new()
            {
                Title = "codeListOne",
                CodeList = validCodeList,
                HasError = false,
            },
            new()
            {
                Title = "codeListTwo",
                HasError = false,
            }
        ];
        List<FileSystemObject> remoteCodeLists =
        [
            new FileSystemObject
            {
                Name = "codeListOne",
                Path = "CodeLists/codeListOne.json",
                Content = System.Text.Json.JsonSerializer.Serialize(validCodeList),
                Sha = "non-descriptive-sha-1"
            },
            new FileSystemObject
            {
                Name = "codeListTwo",
                Path = "CodeLists/codeListTwo.json",
                Content = System.Text.Json.JsonSerializer.Serialize(validCodeList),
                Sha = "non-descriptive-sha-2"
            }
        ];

        var factory = new Mock<IAltinnGitRepositoryFactory>();

        _giteaApiWrapperMock
            .Setup(service => service.GetCodeListDirectoryAsync(Org, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(remoteCodeLists);

        // Act
        OrgCodeListService orgListService = new(factory.Object, _giteaApiWrapperMock.Object);
        await orgListService.UpdateCodeLists(Org, Developer, localCodeListWrappers);


        List<FileOperationContext> files =
        [
            new FileOperationContext{
                Operation = FileOperation.Delete,
                Content = null,
                FromPath = null,
                Path = "CodeLists/codeListTwo.json",
                Sha = "non-descriptive-sha-2"
            }
        ];

        var expectedDto = new GiteaMultipleFilesDto
        {
            Author = new Identity()
            {
                Name = Developer,
                Email = null
            },
            Committer = new Identity()
            {
                Name = Developer,
                Email = null
            },
            Branch = null,
            Files = files,
            Message = "",
        };

        // Assert
        _giteaApiWrapperMock.Verify(s => s.GetCodeListDirectoryAsync(Org, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        _giteaApiWrapperMock.Verify(s => s.ModifyMultipleFiles(Org, It.IsAny<string>(), It.Is<GiteaMultipleFilesDto>(o => o.Equals(expectedDto)), It.IsAny<CancellationToken>()), Times.Once);
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
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        var codeListData = await service.CreateCodeList(TargetOrg, Developer, CodeListId, newCodeList);
        List<Option> codeList = codeListData.Find(e => e.Title == CodeListId).Data;

        // Assert
        Assert.Equal(8, codeListData.Count);
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
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        var codeListData = await service.UpdateCodeList(TargetOrg, Developer, CodeListId, newCodeList);
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
    public async Task UpdateCodeListId_ShouldRenameCodeListFile_WhenValidParameters()
    {
        // Arrange
        const string CodeListId = "codeListString";
        const string NewCodeListId = "new-id";
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        service.UpdateCodeListId(TargetOrg, Developer, CodeListId, NewCodeListId);

        // Assert
        string repositoryDir = TestDataHelper.GetTestDataRepositoryDirectory(TargetOrg, targetRepository, Developer);
        string oldCodeListFilePath = Path.Join(repositoryDir, $"CodeLists/{CodeListId}.json");
        string newCodeListFilePath = Path.Join(repositoryDir, $"CodeLists/{NewCodeListId}.json");
        Assert.False(File.Exists(oldCodeListFilePath));
        Assert.True(File.Exists(newCodeListFilePath));
    }

    // [Fact]
    // public async Task UploadCodeList_ShouldReturnAllCodeListsAfterUploading()
    // {
    //     // Arrange
    //     const string CodeListId = "newCodeList";
    //     const string FileName = $"{CodeListId}.json";
    //     const string JsonCodeList = @"[
    //         {""label"": ""someLabel"",""value"": ""someValue"" },
    //     ]";
    //     List<Option> expectedCodeList = new()
    //     {
    //         new Option
    //         {
    //             Label = "someLabel",
    //             Value = "someValue"
    //         }
    //     };
    //     byte[] codeListBytes = Encoding.UTF8.GetBytes(JsonCodeList);
    //     var stream = new MemoryStream(codeListBytes);
    //     IFormFile file = new FormFile(stream, 0, codeListBytes.Length, FileName, FileName);

    //     TargetOrg = TestDataHelper.GenerateTestOrgName();
    //     string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
    //     await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepository);
    //     var service = GetOrgCodeListService();

    //     // Act
    //     var codeListData = await service.UploadCodeList(TargetOrg, Developer, file);
    //     stream.Close();
    //     List<Option> codeList = codeListData.Find(e => e.Title == CodeListId).Data;

    //     // Assert
    //     Assert.Equal(8, codeListData.Count);
    //     Assert.Equal(expectedCodeList.Count, codeList?.Count);

    //     for (int i = 0; i < codeList?.Count; i++)
    //     {
    //         Assert.Equal(expectedCodeList[i].Label, codeList[i].Label);
    //         Assert.Equal(expectedCodeList[i].Value, codeList[i].Value);
    //         Assert.Equal(expectedCodeList[i].Description, codeList[i].Description);
    //         Assert.Equal(expectedCodeList[i].HelpText, codeList[i].HelpText);
    //     }
    // }

    [Fact]
    public async Task DeleteCodeList_ShouldReturnAllCodeListsAfterDeletion()
    {
        // Arrange
        const string CodeListId = "codeListNumber";
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        var codeListData = await service.DeleteCodeList(TargetOrg, Developer, CodeListId);

        // Assert
        Assert.Equal(6, codeListData.Count);
    }

    [Fact]
    public async Task DeleteCodeList_ShouldThrowExceptionIfCodeListDoesNotExist()
    {
        // Arrange
        const string CodeListId = "codeListWhichDoesNotExist";
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act and assert
        await Assert.ThrowsAsync<LibGit2Sharp.NotFoundException>(async () => await service.DeleteCodeList(TargetOrg, Developer, CodeListId));
    }

    [Fact]
    public async Task CodeListExists_ShouldReturnTrue_WhenCodeListExists()
    {
        // Arrange
        const string CodeListId = "codeListNumber";
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        bool codeListExists = await service.CodeListExists(TargetOrg, Developer, CodeListId);

        // Assert
        Assert.True(codeListExists);
    }

    [Fact]
    public async Task CodeListExists_ShouldReturnFalse_WhenCodeListDoesNotExists()
    {
        // Arrange
        const string CodeListId = "codeListWhichDoesNotExist";
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        bool codeListExists = await service.CodeListExists(TargetOrg, Developer, CodeListId);

        // Assert
        Assert.False(codeListExists);
    }

    [Fact]
    public async Task GetCodeListIds_ShouldReturnListOfCodeListIds_WhenCodeListsExists()
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepo);
        var service = GetOrgCodeListService();

        // Act
        List<string> codeListIds = service.GetCodeListIds(TargetOrg, Developer);

        // Assert
        Assert.Equal(7, codeListIds.Count);
    }

    [Fact]
    public async Task GetCodeListIds_ShouldReturnEmptyList_WhenCodeListDoesNotExist()
    {
        // Arrange
        const string EmptyRepo = "org-content-empty";
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, EmptyRepo, TargetOrg, targetRepo);
        var service = GetOrgCodeListService();

        // Act
        List<string> codeListIds = service.GetCodeListIds(TargetOrg, Developer);

        // Assert
        Assert.Empty(codeListIds);
    }

    private static CodeList SetupCodeList()
    {
        Dictionary<string, string> label = new() { { "nb", "tekst" }, { "en", "text" } };
        Dictionary<string, string> description = new() { { "nb", "Dette er en tekst" }, { "en", "This is a text" } };
        Dictionary<string, string> helpText = new() { { "nb", "Velg dette valget for å få en tekst" }, { "en", "Choose this option to get a text" } };
        List<Code> listOfCodes =
        [
            new()
            {
                Value = "value1",
                Label = label,
                Description = description,
                HelpText = helpText,
                Tags = ["test-data"]
            }
        ];
        CodeList codeList = new()
        {
            SourceName = "test-data-files",
            Codes = listOfCodes,
            TagNames = ["test-data-category"]
        };
        return codeList;
    }

    private static OrgCodeListService GetOrgCodeListService()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory =
            new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        OrgCodeListService service = new(altinnGitRepositoryFactory, new IGiteaMock());

        return service;
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(TargetOrg))
        {
            TestDataHelper.DeleteOrgDirectory(Developer, TargetOrg);
        }
    }
}
