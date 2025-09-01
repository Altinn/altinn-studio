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
using LibGit2Sharp;

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
        List<FileSystemObject> files = await _giteaApiWrapper.GetDirectoryAsync(orgName, GetContentRepoName(orgName), CodeListFolderPath, string.Empty);
        if (files is null)
        {
            return [];
        }
        IEnumerable<string> fileNames = files.Select(file => file.Name);
        return fileNames.Select(Path.GetFileNameWithoutExtension).ToList();
    }

    /// <inheritdoc />
    public async Task<List<Option>> GetCodeList(string orgName, string codeListId)
    {
        string filePath = StaticContentCodeListFilePath(codeListId);
        string decodedString = await GetFileFromGitea(orgName, filePath);
        return string.IsNullOrEmpty(decodedString) ? [] : JsonSerializer.Deserialize<List<Option>>(decodedString, s_jsonOptions);
    }

    /// <inheritdoc />
    public async Task<bool> CodeListExists(string orgName, string codeListId)
    {
        List<string> codeListIds = await GetCodeListIds(orgName);
        return codeListIds.Contains(codeListId);
    }

    /// <inheritdoc />
    public async Task<List<string>> GetTextIds(string orgName)
    {
        HashSet<string> textIds = [];
        List<string> languageCodes = await GetLanguages(orgName);

        foreach (string languageCode in languageCodes)
        {
            TextResource textResource = await GetTextResource(orgName, languageCode);
            IEnumerable<string> textResourceElementIds = textResource.Resources.Select(textResourceElement => textResourceElement.Id);
            textIds.UnionWith(textResourceElementIds);
        }

        return textIds.ToList();
    }

    /// <inheritdoc />
    public async Task<string> GetShaForCodeListFile(string orgName, string codeListId)
    {
        string repoName = GetContentRepoName(orgName);
        string filePath = StaticContentCodeListFilePath(codeListId);
        FileSystemObject file = await _giteaApiWrapper.GetFileAsync(orgName, repoName, filePath, string.Empty);
        return file.Sha ?? string.Empty;
    }

    public async Task<TextResource> GetTextResource(string orgName, string languageCode)
    {
        string filePath = StaticContentTextResourceFilePath(languageCode);
        string decodedString = await GetFileFromGitea(orgName, filePath);
        if (string.IsNullOrEmpty(decodedString))
        {
            throw new NotFoundException("Text resource file not found.");
        }
        return JsonSerializer.Deserialize<TextResource>(decodedString, s_jsonOptions);
    }

    public async Task<List<string>> GetLanguages(string orgName)
    {
        List<FileSystemObject> files = await _giteaApiWrapper.GetDirectoryAsync(orgName, GetContentRepoName(orgName), TextResourceFolderPath, string.Empty);
        if (files is null)
        {
            return [];
        }

        List<string> languages = ExtractLanguagesFromResourceFiles(files);

        languages.Sort(StringComparer.Ordinal);
        return languages;
    }

    private static List<string> ExtractLanguagesFromResourceFiles(List<FileSystemObject> files)
    {
        return files
            .Select(file => Path.GetFileNameWithoutExtension(file.Name))
            .Where(fileName => fileName != null)
            .Select(fileName => Regex.Match(fileName, @"^resource\.(?<lang>[A-Za-z]{2,3})$"))
            .Where(match => match.Success)
            .Select(match => match.Groups["lang"].Value)
            .ToList();
    }

    private async Task<string> GetFileFromGitea(string orgName, string filePath)
    {
        string repoName = GetContentRepoName(orgName);
        FileSystemObject file = await _giteaApiWrapper.GetFileAsync(orgName, repoName, filePath, string.Empty);
        if (string.IsNullOrEmpty(file?.Content))
        {
            return string.Empty;
        }
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
