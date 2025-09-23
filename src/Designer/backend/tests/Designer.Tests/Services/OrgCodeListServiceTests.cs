using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.CodeList;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation.Organisation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class OrgCodeListServiceTests : IDisposable
{
    private string TargetOrg { get; set; }

    private const string Org = "ttd";
    private const string Repo = "org-content";
    private const string Developer = "testUser";
    private readonly Mock<IGitea> _giteaMock = new();
    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

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
    public async Task GetCodeListsNew()
    {
        // Arrange
        const string FosWithContentName = "hasContent";
        const string FosWithoutContentName = "noContent";

        CodeList validCodeList = SetupCodeList();
        List<FileSystemObject> remoteFiles =
        [
            new()
            {
                Name = FosWithContentName,
                Path = $"CodeLists/{FosWithContentName}.json",
                Content = FromStringToBase64String(JsonSerializer.Serialize(validCodeList)),
                Sha = "non-descriptive-sha-1"
            },
            new()
            {
                Name = FosWithoutContentName,
                Path = $"CodeLists/{FosWithoutContentName}.json",
                Content = null,
                Sha = "non-descriptive-sha-2"
            }
        ];
        List<CodeListWrapper> expected =
        [
            new(
                Title: FosWithContentName,
                CodeList: validCodeList,
                HasError: false
            ),
            new(
                Title: FosWithoutContentName,
                CodeList: null,
                HasError: true
            )
        ];
        _giteaMock
            .Setup(service => service.GetCodeListDirectoryContentAsync(Org, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(remoteFiles);

        // Act
        OrgCodeListService service = GetOrgCodeListService();
        List<CodeListWrapper> result = await service.GetCodeListsNew(Org);

        // Assert
        Assert.NotEmpty(result);
        Assert.Equal(expected, result);
        _giteaMock.Verify(gitea => gitea.GetCodeListDirectoryContentAsync(Org, It.IsAny<string>(), string.Empty, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public void PrepareFile_Deletion()
    {
        // Arrange
        const string Title = "irrelevant";
        CodeListWrapper codeListWrapper = new(
            Title: Title,
            CodeList: null,
            HasError: null
        );
        Dictionary<string, string> fileMetadata = new() { { Title, "non-descriptive-sha" } };
        string sha = fileMetadata[Title];

        // Act
        OrgCodeListService service = GetOrgCodeListService();
        FileOperationContext result = service.PrepareFile(FileOperation.Delete, codeListWrapper, sha);

        // Assert
        Assert.Equal(FileOperation.Delete, result.Operation);
        Assert.Null(result.Content);
        Assert.Equal(fileMetadata[Title], result.Sha);
        Assert.Contains(Title, result.Path);
    }

    [Fact]
    public void PrepareFile_Update()
    {
        // Arrange
        const string Title = "irrelevant";
        CodeList codeList = SetupCodeList();
        CodeListWrapper codeListWrapper = new(
            Title: Title,
            CodeList: codeList,
            HasError: false
        );
        Dictionary<string, string> fileMetadata = new() { { Title, "non-descriptive-sha" } };
        string sha = fileMetadata[Title];

        // Act
        OrgCodeListService orgListService = GetOrgCodeListService();
        FileOperationContext result = orgListService.PrepareFile(FileOperation.Update, codeListWrapper, sha);

        // Assert
        Assert.NotNull(result.Content);
        byte[] resultAsBytes = Convert.FromBase64String(result.Content!);
        CodeList actualCodelist = JsonSerializer.Deserialize<CodeList>(resultAsBytes, s_jsonOptions);
        Assert.Equal(codeList, actualCodelist);

        Assert.Equal(FileOperation.Update, result.Operation);
        Assert.Equal(fileMetadata[Title], result.Sha);
        Assert.Contains(Title, result.Path);
    }

    [Fact]
    public void PrepareFile_Creation()
    {
        // Arrange
        const string Title = "irrelevant";
        CodeList codeList = SetupCodeList();
        CodeListWrapper codeListWrapper = new(
            Title: Title,
            CodeList: codeList,
            HasError: false
        );

        // Act
        OrgCodeListService orgListService = GetOrgCodeListService();
        FileOperationContext result = orgListService.PrepareFile(FileOperation.Create, codeListWrapper);

        // Assert
        Assert.NotNull(result.Content);
        byte[] resultAsBytes = Convert.FromBase64String(result.Content!);
        CodeList actualCodelist = JsonSerializer.Deserialize<CodeList>(resultAsBytes, s_jsonOptions);
        Assert.Equal(codeList, actualCodelist);

        Assert.Equal(FileOperation.Create, result.Operation);
        Assert.Null(result.Sha);
        Assert.Contains(Title, result.Path);
    }

    [Theory]
    [InlineData(FileOperation.Update, false)]
    [InlineData(FileOperation.Delete, true)]
    public void PrepareFile_UpdateAndDeleteWithoutSha_ThrowsArgumentException(string operation, bool setCodeListToNull)
    {
        // Arrange
        const string Title = "irrelevant";
        CodeList codeList = SetupCodeList();
        CodeListWrapper codeListWrapper = new(
            Title: Title,
            CodeList: setCodeListToNull ? null : codeList,
            HasError: null
        );

        // Act and Assert
        OrgCodeListService orgListService = GetOrgCodeListService();
        Assert.Throws<ArgumentException>(() => orgListService.PrepareFile(operation, codeListWrapper, null));
    }

    [Fact]
    public void PrepareFile_CreateWithSha_ThrowsArgumentException()
    {
        // Arrange
        const string Title = "irrelevant";
        const string Sha = "should-not-exist";
        CodeList codeList = SetupCodeList();
        CodeListWrapper codeListWrapper = new(
            Title: Title,
            CodeList: codeList,
            HasError: null
        );

        // Act and Assert
        OrgCodeListService orgListService = GetOrgCodeListService();
        Assert.Throws<ArgumentException>(() => orgListService.PrepareFile(FileOperation.Create, codeListWrapper, Sha));
    }

    [Fact]
    public void ExtractContentFromFiles()
    {
        // Arrange
        const string FosWithContentName = "hasContent";
        const string FosWithoutContentName = "noContent";
        const string FosWithContentSha = "non-descriptive-sha-1";
        const string FosWithoutContentSha = "non-descriptive-sha-2";

        CodeList validCodeList = SetupCodeList();
        List<FileSystemObject> remoteFiles =
        [
            new()
            {
                Name = FosWithContentName,
                Path = $"CodeLists/{FosWithContentName}.json",
                Content = FromStringToBase64String(JsonSerializer.Serialize(validCodeList)),
                Sha = FosWithContentSha
            },
            new()
            {
                Name = FosWithoutContentName,
                Path = $"CodeLists/{FosWithoutContentName}.json",
                Content = null,
                Sha = FosWithoutContentSha
            }
        ];

        // Act
        (List<CodeListWrapper> result, Dictionary<string, string> fileMetadata) = OrgCodeListService.ExtractContentFromFiles(remoteFiles);

        // Assert
        Assert.NotEmpty(result);
        Assert.Equal(2, result.Count);
        Assert.Equal(2, fileMetadata.Count);
        Assert.True(result.First(csw => csw.Title == FosWithoutContentName).HasError);
        Assert.False(result.First(csw => csw.Title == FosWithContentName).HasError);
        Assert.Equal(FosWithContentSha, fileMetadata[FosWithContentName]);
        Assert.Equal(FosWithoutContentSha, fileMetadata[FosWithoutContentName]);
    }

    [Fact]
    public void CreateFileOperationContexts()
    {
        // Arrange
        const string ShouldResolveToUpdateOperation = "shouldResolveToUpdateOperation";
        const string ShouldResolveToDeleteOperation = "shouldResolveToDeleteOperation";
        const string ShouldResolveToCreateOperation = "shouldResolveToCreateOperation";
        CodeList codeList = SetupCodeList();
        Dictionary<string, string> label = new() { { "nb", "tekst" }, { "en", "text" } };
        Dictionary<string, string> description = new() { { "nb", "Dette er en tekst" }, { "en", "This is a text" } };
        Dictionary<string, string> helpText = new() { { "nb", "Velg dette valget for å få en tekst" }, { "en", "Choose this option to get a text" } };
        List<Code> listOfCodes =
        [
            new(
                value: "updatedValue",
                label: label,
                description: description,
                helpText: helpText,
                tags: ["test-data"]
            )
        ];
        CodeListSource source = new(Name: "test-data-files");
        CodeList updatedCodeList = new(
            Source: source,
            Codes: listOfCodes,
            TagNames: ["test-data-category"]
        );
        var codeListWrappers = new List<CodeListWrapper>
        {
            new(
                Title: ShouldResolveToUpdateOperation,
                CodeList: codeList
            ),
            new(
                Title: ShouldResolveToDeleteOperation
            ),
            new(
                Title: ShouldResolveToCreateOperation,
                CodeList: codeList
            )
        };
        var existingFiles = new List<FileSystemObject>
        {
            new()
            {
                Name = ShouldResolveToUpdateOperation,
                Path = $"CodeLists/{ShouldResolveToUpdateOperation}.json",
                Encoding = "base64",
                Content = FromStringToBase64String(JsonSerializer.Serialize(updatedCodeList)),
                Sha = "non-descriptive-sha-1",
                Type = "file"
            },
            new()
            {
                Name = ShouldResolveToDeleteOperation,
                Path = $"CodeLists/{ShouldResolveToDeleteOperation}.json",
                Encoding = "base64",
                Content = FromStringToBase64String(JsonSerializer.Serialize(codeList)),
                Sha = "non-descriptive-sha-2",
                Type = "file"
            }
        };

        // Act
        OrgCodeListService orgListService = GetOrgCodeListService();
        List<FileOperationContext> result = orgListService.CreateFileOperationContexts(codeListWrappers, existingFiles);

        FileOperationContext updateOperation = result.FirstOrDefault(fo => fo.Path == $"CodeLists/{ShouldResolveToUpdateOperation}.json");
        FileOperationContext deleteOperation = result.FirstOrDefault(fo => fo.Path == $"CodeLists/{ShouldResolveToDeleteOperation}.json");
        FileOperationContext createOperation = result.FirstOrDefault(fo => fo.Path == $"CodeLists/{ShouldResolveToCreateOperation}.json");

        // Assert
        Assert.Equal(3, result.Count);
        Assert.NotNull(updateOperation);
        Assert.NotNull(updateOperation.Sha);
        Assert.NotNull(updateOperation.Content);
        Assert.Equal(FileOperation.Update, updateOperation.Operation);
        var updateDecoded = JsonSerializer.Deserialize<CodeList>(Convert.FromBase64String(updateOperation.Content), s_jsonOptions);
        Assert.Equal(codeList, updateDecoded);

        Assert.NotNull(deleteOperation);
        Assert.NotNull(deleteOperation.Sha);
        Assert.Null(deleteOperation.Content);
        Assert.Equal(FileOperation.Delete, deleteOperation.Operation);

        Assert.NotNull(createOperation);
        Assert.Null(createOperation.Sha);
        Assert.NotNull(createOperation.Content);
        Assert.Equal(FileOperation.Create, createOperation.Operation);
        var createDecoded = JsonSerializer.Deserialize<CodeList>(Convert.FromBase64String(createOperation.Content), s_jsonOptions);
        Assert.Equal(codeList, createDecoded);
    }

    [Fact]
    public async Task UpdateCodeListsNew()
    {
        // Arrange
        const string GiteaCommitMessage = "some message";
        const string Reference = "some reference";
        CodeList validCodeList = SetupCodeList();
        List<CodeListWrapper> localCodeListWrappers = [
            new(Title: "codeListOne", CodeList: validCodeList),
            new(Title: "codeListTwo")
        ];
        List<FileSystemObject> remoteCodeLists =
        [
            new()
            {
                Name = "codeListOne",
                Path = "CodeLists/codeListOne.json",
                Content = FromStringToBase64String(JsonSerializer.Serialize(validCodeList)),
                Sha = "non-descriptive-sha-1"
            },
            new()
            {
                Name = "codeListTwo",
                Path = "CodeLists/codeListTwo.json",
                Content = FromStringToBase64String(JsonSerializer.Serialize(validCodeList)),
                Sha = "non-descriptive-sha-2"
            }
        ];

        _giteaMock
            .Setup(service => service.GetCodeListDirectoryContentAsync(Org, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(remoteCodeLists);

        // Act
        OrgCodeListService orgListService = GetOrgCodeListService();
        await orgListService.UpdateCodeListsNew(Org, Developer, localCodeListWrappers, GiteaCommitMessage, Reference);


        List<FileOperationContext> files =
        [
            new(
                Operation: FileOperation.Delete,
                Path: "CodeLists/codeListTwo.json",
                Sha: "non-descriptive-sha-2"
            )
        ];

        var expectedDto = new GiteaMultipleFilesDto(
            Author: new GiteaIdentity(Name: Developer),
            Branch: string.Empty,
            Committer: new GiteaIdentity(Name: Developer),
            Files: files,
            Message: GiteaCommitMessage
        );

        // Assert
        _giteaMock.Verify(s => s.GetCodeListDirectoryContentAsync(Org, It.IsAny<string>(), Reference, It.IsAny<CancellationToken>()), Times.Once);
        _giteaMock.Verify(s => s.ModifyMultipleFiles(Org, It.IsAny<string>(), It.Is<GiteaMultipleFilesDto>(dto => expectedDto.Equals(dto)), It.IsAny<CancellationToken>()), Times.Once);
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

        const string CodeListId = "newCodeList";
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

        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, Repo, TargetOrg, targetRepository);
        var service = GetOrgCodeListService();

        // Act
        var codeListData = await service.UploadCodeList(TargetOrg, Developer, file);
        stream.Close();
        List<Option> codeList = codeListData.Find(e => e.Title == CodeListId).Data;

        // Assert
        Assert.Equal(8, codeListData.Count);
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

    [Theory]
    [InlineData("_invalidTitle")]
    [InlineData("-invalidTitle")]
    [InlineData("invalid-title")]
    [InlineData("invalid.title")]
    [InlineData("invalid title")]
    [InlineData("invalid/title")]

    public void ValidateCodeListTitles_ShouldThrowException_WhenTitleIsInvalid(string invalidTitle)
    {
        // Arrange
        List<CodeListWrapper> codeListWrappers = [
            new(
                Title: invalidTitle,
                HasError: true
            )
        ];

        // Act and Assert
        Assert.Throws<IllegalFileNameException>(() => OrgCodeListService.ValidateCodeListTitles(codeListWrappers));
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void ValidateCommitMessage_Allows_MissingCommitMessage(string invalidCommitMessage)
    {
        // Arrange, Act and Assert
        OrgCodeListService.ValidateCommitMessage(invalidCommitMessage); // Should not throw exception
    }

    [Fact]
    public void ValidateCommitMessage_ShouldThrowException_WhenCommitMessageIsTooLong()
    {
        // Arrange
        string invalidCommitMessage = new('a', 5121);

        // Act and Assert
        Assert.Throws<IllegalCommitMessageException>(() => OrgCodeListService.ValidateCommitMessage(invalidCommitMessage));
    }

    private static CodeList SetupCodeList()
    {
        Dictionary<string, string> label = new() { { "nb", "tekst" }, { "en", "text" } };
        Dictionary<string, string> description = new() { { "nb", "Dette er en tekst" }, { "en", "This is a text" } };
        Dictionary<string, string> helpText = new() { { "nb", "Velg dette valget for å få en tekst" }, { "en", "Choose this option to get a text" } };
        List<Code> listOfCodes =
        [
            new(
                value: "value1",
                label: label,
                description: description,
                helpText: helpText,
                tags: ["test-data"]
            )
        ];
        CodeListSource source = new(Name: "test-data-files");
        CodeList codeList = new(
            Source: source,
            Codes: listOfCodes,
            TagNames: ["test-data-category"]
        );
        return codeList;
    }

    private string FromStringToBase64String(string content)
    {
        byte[] contentAsBytes = Encoding.UTF8.GetBytes(content);
        return Convert.ToBase64String(contentAsBytes);
    }

    private OrgCodeListService GetOrgCodeListService()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        return new OrgCodeListService(altinnGitRepositoryFactory, _giteaMock.Object);
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(TargetOrg))
        {
            TestDataHelper.DeleteOrgDirectory(Developer, TargetOrg);
        }
    }
}
