#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;

namespace Altinn.Studio.Designer.Services.Implementation.Organisation;

public class OrgTextsService : IOrgTextsService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">altinnGitRepositoryFactory</param>
    public OrgTextsService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    /// <inheritdoc />
    public async Task<TextResource> GetText(string org, string developer, string languageCode, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetContentRepoName(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        TextResource texts = await altinnOrgGitRepository.GetText(languageCode, cancellationToken);

        return texts;
    }

    /// <inheritdoc />
    public async Task SaveText(string org, string developer, TextResource textResource, string languageCode, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetContentRepoName(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        string[] duplicateKeys = textResource.Resources.GroupBy(tre => tre.Id).Where(grp => grp.Count() > 1).Select(grp => grp.Key).ToArray();
        if (duplicateKeys.Length > 0)
        {
            throw new ArgumentException(
                $"Text keys must be unique. Please review keys: {string.Join(", ", duplicateKeys)}");
        }

        await altinnOrgGitRepository.SaveText(languageCode, textResource, cancellationToken);
    }


    /// <inheritdoc />
    public async Task UpdateTextsForKeys(string org, string developer, Dictionary<string, string> keysTexts, string languageCode, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string repo = GetContentRepoName(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);
        await EnsureTextResourceExists(altinnOrgGitRepository, languageCode, cancellationToken);
        TextResource textResourceObject = await altinnOrgGitRepository.GetText(languageCode, cancellationToken);

        foreach (KeyValuePair<string, string> kvp in keysTexts)
        {
            TextResourceElement textResourceContainsKey = textResourceObject.Resources.Find(textResourceElement => textResourceElement.Id == kvp.Key);
            if (textResourceContainsKey is null)
            {
                textResourceObject.Resources.Insert(0, new TextResourceElement() { Id = kvp.Key, Value = kvp.Value });
            }
            else
            {
                int indexTextResourceElementUpdateKey = textResourceObject.Resources.IndexOf(textResourceContainsKey);
                if (textResourceContainsKey.Variables == null)
                {
                    textResourceObject.Resources[indexTextResourceElementUpdateKey] = new TextResourceElement { Id = kvp.Key, Value = kvp.Value };
                }
                else
                {
                    List<TextResourceVariable> variables = textResourceContainsKey.Variables;
                    textResourceObject.Resources[indexTextResourceElementUpdateKey] = new TextResourceElement { Id = kvp.Key, Value = kvp.Value, Variables = variables };
                }
            }
        }

        await altinnOrgGitRepository.SaveText(languageCode, textResourceObject, cancellationToken);
    }

    private static async Task EnsureTextResourceExists(AltinnOrgGitRepository altinnOrgGitRepository, string languageCode, CancellationToken cancellationToken)
    {
        if (!altinnOrgGitRepository.TextResourceFileExists(languageCode))
        {
            var emptyTextResource = new TextResource { Language = languageCode, Resources = [] };
            await altinnOrgGitRepository.SaveText(languageCode, emptyTextResource, cancellationToken);
        }
    }

    /// <inheritdoc />
    public async Task<List<string>> GetTextIds(string org, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        List<string> textKeys = [];
        List<string> languages = GetLanguages(org, developer, cancellationToken);
        foreach (string languageCode in languages)
        {
            TextResource textResource = await GetText(org, developer, languageCode, cancellationToken);
            List<string> textIds = textResource.Resources.Select(textResourceElement => textResourceElement.Id).ToList();
            textKeys.AddRange(textIds);
        }

        return textKeys.Distinct().ToList();
    }

    /// <inheritdoc />
    public List<string> GetLanguages(string org, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string repo = GetContentRepoName(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        return altinnOrgGitRepository.GetLanguages();
    }

    private static string GetContentRepoName(string org)
    {
        return $"{org}-content";
    }
}
