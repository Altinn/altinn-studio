using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;

namespace Altinn.Studio.Designer.Services.Implementation.Organisation;

public class OrgTextsService : IOrgTextsService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IApplicationMetadataService _applicationMetadataService;

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
    /// <param name="applicationMetadataService">IApplicationMetadataService</param>
    public OrgTextsService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IApplicationMetadataService applicationMetadataService)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _applicationMetadataService = applicationMetadataService;
    }

    /// <inheritdoc />
    public async Task<TextResource> GetText(string org, string repo, string developer, string languageCode)
    {
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        TextResource texts = await altinnOrgGitRepository.GetText(languageCode);

        return texts;
    }

    /// <inheritdoc />
    public async Task SaveText(string org, string repo, string developer, TextResource textResource, string languageCode)
    {
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        string[] duplicateKeys = textResource.Resources.GroupBy(tre => tre.Id).Where(grp => grp.Count() > 1).Select(grp => grp.Key).ToArray();
        if (duplicateKeys.Length > 0)
        {
            throw new ArgumentException($"Text keys must be unique. Please review keys: {string.Join(", ", duplicateKeys)}");
        }

        await UpdateAppTitleInApplicationMetadata(textResource, org, repo);

        await altinnOrgGitRepository.SaveText(languageCode, textResource);
    }

    private async Task UpdateAppTitleInApplicationMetadata(TextResource textResource, string org, string repo)
    {
        TextResourceElement appTitleResourceElement = textResource.Resources.FirstOrDefault(tre => tre.Id == "appName" || tre.Id == "ServiceName");

        if (appTitleResourceElement != null && !string.IsNullOrEmpty(appTitleResourceElement.Value))
        {
            await _applicationMetadataService.UpdateAppTitleInAppMetadata(org, repo, "nb", appTitleResourceElement.Value);
        }
        else
        {
            throw new ArgumentException("The application name must be a value.");
        }
    }

    /// <inheritdoc />
    public async Task UpdateTextsForKeys(string org, string repo, string developer, Dictionary<string, string> keysTexts, string languageCode)
    {
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);
        TextResource textResourceObject = await altinnOrgGitRepository.GetText(languageCode);

        // handle if file not already exist
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

        await altinnOrgGitRepository.SaveText(languageCode, textResourceObject);
    }
}
