#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Implementations;
using Altinn.Studio.Designer.Models;
using Microsoft.Extensions.Logging;
using Moq;
using VerifyXunit;
using Xunit;

namespace Designer.Tests.Clients;

public class LocalFileSharedContentClientTests
{
    private readonly string _basePath = Path.Join(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "altinn", "published_resources");

    [Fact]
    public void CombineWithDelimiter()
    {
        // Arrange
        string firstParam = "first";
        string secondParam = "second";
        string thirdParam = "third";
        string expected = "first/second/third";

        // Act
        string result = LocalFileSharedContentClient.CombineWithDelimiter(firstParam, secondParam, thirdParam);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void CombineWithDelimiter_Nulls()
    {
        // Arrange
        string? firstParam = null;
        string? secondParam = null;
        string expected = "";

        // Act
        string result = LocalFileSharedContentClient.CombineWithDelimiter(firstParam, secondParam);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void CombineWithDelimiter_LeftNull()
    {
        // Arrange
        string? firstParam = null;
        string? secondParam = "second";
        string expected = "second";

        // Act
        string result = LocalFileSharedContentClient.CombineWithDelimiter(firstParam, secondParam);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void CombineWithDelimiter_RightNull()
    {
        // Arrange
        string? firstParam = "first";
        string? secondParam = null;
        string expected = "first";

        // Act
        string result = LocalFileSharedContentClient.CombineWithDelimiter(firstParam, secondParam);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void JsonFileName()
    {
        // Arrange
        string fileName = "someFileName";
        string expected = "someFileName.json";

        // Act
        string result = LocalFileSharedContentClient.JsonFileName(fileName);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void SetCurrentVersion()
    {
        // Arrange
        List<string> versionPrefixes = ["ttd/code_lists/countries/1.json", "ttd/code_lists/countries/2.json"];
        string expected = "3";
        LocalFileSharedContentClient client = GetClientForTest();

        // Act
        client.SetCurrentVersion(versionPrefixes);

        // Assert
        Assert.Equal(expected, client.CurrentVersion);
    }

    [Fact]
    public void SetCurrentVersion_EmptyInputList()
    {
        // Arrange
        List<string> versionPrefixes = [];
        string expected = "1";
        LocalFileSharedContentClient client = GetClientForTest();

        // Act
        client.SetCurrentVersion(versionPrefixes);

        // Assert
        Assert.Equal(expected, client.CurrentVersion);
    }

    [Fact]
    public async Task AddIndexFile()
    {
        // Arrange
        string indexPath = "ttd/_index.json";
        string prefix = "ttd/code_lists";
        List<string> prefixes = [prefix];
        LocalFileSharedContentClient client = GetClientForTest();

        // Act
        client.AddIndexFile(indexPath, prefixes);

        // Assert
        Assert.NotEmpty(client.FileNamesAndContent);
        await Verifier.Verify(client.FileNamesAndContent);
    }

    [Fact]
    public async Task CreateCodeListFiles()
    {
        // Arrange
        CodeList codeList = SetupCodeList();
        string codeListFolderPath = "ttd/code_lists/countries";
        string versionPrefix = "ttd/code_lists";
        LocalFileSharedContentClient client = GetClientForTest();

        // Act
        client.CreateCodeListFiles(codeList, codeListFolderPath, versionPrefix);

        // Assert
        Assert.NotEmpty(client.FileNamesAndContent);
        await Verifier.Verify(client.FileNamesAndContent);
    }

    [Fact]
    public void ValidatePathIsSubPath()
    {
        // Arrange
        string path = Path.Join(_basePath, "somePath");
        LocalFileSharedContentClient client = GetClientForTest();

        // Act
        client.ValidatePathIsSubPath(path);

        // Assert
        Assert.True(true);
    }

    [Fact]
    public void ValidatePathIsSubPath_ThrowsExceptionWhenPathIsIllegal()
    {
        // Arrange
        string path = Path.Join(_basePath, "../../someIllegalPath");
        LocalFileSharedContentClient client = GetClientForTest();

        // Act and Assert
        Assert.Throws<UnauthorizedAccessException>(() => client.ValidatePathIsSubPath(path));
    }

    private static CodeList SetupCodeList()
    {
        Dictionary<string, string> label = new() { { "nb", "tekst" }, { "en", "text" } };
        Dictionary<string, string> description = new() { { "nb", "Dette er en tekst" }, { "en", "This is a text" } };
        Dictionary<string, string> helpText = new() { { "nb", "Velg dette valget for å få en tekst" }, { "en", "Choose this option to get a text" } };
        List<Code> listOfCodes =
        [
            new(
                Value: "value1",
                Label: label,
                Description: description,
                HelpText: helpText,
                Tags: ["test-data"]
            )
        ];
        CodeListSource source = new(Name: "test-data-files");
        return new CodeList(
            Source: source,
            Codes: listOfCodes,
            TagNames: ["test-data-category"]
        );
    }

    private static LocalFileSharedContentClient GetClientForTest()
    {
        Mock<ILogger<LocalFileSharedContentClient>> logger = new();

        return new LocalFileSharedContentClient(logger.Object);
    }
}
