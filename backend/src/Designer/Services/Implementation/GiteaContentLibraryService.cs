using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class GiteaContentLibraryService : IGiteaContentLibraryService
{
    private readonly IGitea _giteaApiWrapper;
    private const string CodeListFolderPath = "CodeLists/";
    private const string TextResourceFolderPath = "Texts/";

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public GiteaContentLibraryService(IGitea giteaApiWrapper)
    {
        _giteaApiWrapper = giteaApiWrapper;
    }

    /// <inheritdoc />
    public async Task<List<string>> GetCodeListIds(string orgName)
    {
        List<FileSystemObject> files = await _giteaApiWrapper.GetDirectoryAsync(orgName, GetContentRepoName(orgName), CodeListFolderPath, "");
        IEnumerable<string> fileNames = files.Select(file => file.Name);
        return fileNames.Select(Path.GetFileNameWithoutExtension).ToList();
    }

    /// <inheritdoc />
    public async Task<List<Option>> GetCodeList(string orgName, string optionListId)
    {
        string filePath = StaticContentCodeListFilePath(optionListId);
        string decodedString = await GetFileFromGitea(orgName, filePath);
        return JsonSerializer.Deserialize<List<Option>>(decodedString);
    }

    /// <inheritdoc />
    public async Task<List<string>> GetTextIds(string orgName)
    {
        List<string> textIds = [];
        List<string> languageCodes = await GetLanguages(orgName);

        foreach (string languageCode in languageCodes)
        {
            string textResourceString = await GetFileFromGitea(orgName, StaticContentTextResourceFilePath(languageCode));
            TextResource textResource = JsonSerializer.Deserialize<TextResource>(textResourceString, s_jsonOptions);

            if (textResource.Resources.Count == 0) { continue; }
            IEnumerable<string> textResourceElementIds = textResource.Resources.Select(textResourceElement => textResourceElement.Id);
            textIds.AddRange(textResourceElementIds);
        }

        return textIds.Distinct().ToList();
    }

    public async Task<TextResource> GetTextResource(string orgName, string languageCode)
    {
        string filePath = StaticContentTextResourceFilePath(languageCode);
        string decodedString = await GetFileFromGitea(orgName, filePath);
        return JsonSerializer.Deserialize<TextResource>(decodedString, s_jsonOptions);
    }

    public async Task<List<string>> GetLanguages(string orgName)
    {
        List<FileSystemObject> files = await _giteaApiWrapper.GetDirectoryAsync(orgName, GetContentRepoName(orgName), TextResourceFolderPath, "");
        IEnumerable<string> languageFilePaths = files.Select(file => file.Name);
        IEnumerable<string> fileNames = languageFilePaths
            .Select(Path.GetFileName)
            .Select(Path.GetFileNameWithoutExtension);

        List<string> languages = [];
        foreach (string fileName in fileNames)
        {
            var match = Regex.Match(fileName, @"^resource\.(?<lang>[A-Za-z]{2,3})$");
            if (match.Success)
            {
                languages.Add(fileName.Split('.')[^1]);
            }
        }

        languages.Sort(StringComparer.Ordinal);
        return languages;
    }

    private async Task<string> GetFileFromGitea(string orgName, string filePath)
    {
        string repoName = GetContentRepoName(orgName);
        FileSystemObject file = await _giteaApiWrapper.GetFileAsync(orgName, repoName, filePath, "");
        byte[] binaryData = Convert.FromBase64String(file.Content);
        return Encoding.UTF8.GetString(binaryData);
    }

    private static string StaticContentTextResourceFilePath(string languageCode)
    {
        return Path.Join(TextResourceFolderPath, $"resource.{languageCode}.json");
    }

    private static string StaticContentCodeListFilePath(string optionListId)
    {
        return Path.Join(CodeListFolderPath, $"{optionListId}.json");
    }

    private static string GetContentRepoName(string orgName)
    {
        return $"{orgName}-content";
    }
}
