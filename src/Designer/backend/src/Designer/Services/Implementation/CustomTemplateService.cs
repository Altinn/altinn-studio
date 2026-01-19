using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using NJsonSchema;
using NJsonSchema.Validation;

namespace Altinn.Studio.Designer.Services.Implementation;

public class CustomTemplateService : ICustomTemplateService
{
    private const string SchemaFileName = "templateManifest.schema.json";
    private const string AltinnStudioOrg = "als";
    private const string TemplateFolder = "Templates/";
    private const string TemplateFileName = "template.json";
    private const string TemplateManifestFileName = "templateManifest.json";

    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IGiteaClient _giteaClient;

    public string AppTemplateManifestSchemaLocation { get; } = Path.Combine(AppContext.BaseDirectory, "Schemas", SchemaFileName);

    public CustomTemplateService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IGiteaClient giteaClient)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _giteaClient = giteaClient;
    }

    /// <summary>
    /// Validates a JSON string against the AppTemplateManifest JSON schema using NJsonSchema.
    /// </summary>
    /// <param name="jsonString">The JSON string to validate.</param>
    /// <returns>A list of validation errors. Empty if valid.</returns>
    public static async Task<ICollection<ValidationError>> ValidateManifestJsonAsync(string jsonString)
    {
        if (string.IsNullOrWhiteSpace(jsonString))
        {
            throw new ArgumentException("JSON string must not be null or empty.", nameof(jsonString));
        }

        string schemaPath = Path.Combine(AppContext.BaseDirectory, "Schemas", SchemaFileName);

        if (!File.Exists(schemaPath))
        {
            throw new FileNotFoundException($"Application Template Manifest Schema file not found at {schemaPath}");
        }

        var schema = await JsonSchema.FromFileAsync(schemaPath);
        var errors = schema.Validate(jsonString);

        return errors;
    }

    public async Task<List<CustomTemplate>> GetCustomTemplateList(string developer, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        List<CustomTemplate> templates = [];

        cancellationToken.ThrowIfCancellationRequested();

        templates.AddRange(await GetTemplateListForAls(cancellationToken));

        return templates;
    }

    private async Task<List<CustomTemplate>> GetTemplateListForAls(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string repository = GetContentRepoName(AltinnStudioOrg);
        string baseCommitSha = await _giteaClient.GetLatestCommitOnBranch(AltinnStudioOrg, repository, cancellationToken: cancellationToken);

        string path = Path.Combine(TemplateFolder, TemplateManifestFileName);
        (FileSystemObject? file, ProblemDetails? problem) = await _giteaClient.GetFileAndErrorAsync(AltinnStudioOrg, repository, path, null, cancellationToken); // passing null as reference to get main branch and latest commit

        if (problem != null)
        {
            // do something with the problem details. 

        }

        try
        {
            List<CustomTemplate> templates = JsonSerializer.Deserialize<List<CustomTemplate>>(Encoding.UTF8.GetString(Convert.FromBase64String(file.Content))) ?? [];
            return templates;
        }
        catch
        {
            // do something with the exception
        }

        return [];
    }

    public async Task<CustomTemplate> GetCustomTemplate(string developer, string owner, string id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetContentRepoName(owner);

        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(owner, repo, developer);

        return await altinnOrgGitRepository.GetCustomTemplate(id, cancellationToken);
    }


    private async Task<List<CustomTemplate>> GetTemplateListForPublisher(string owner, string developer, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string repo = GetContentRepoName(owner);

        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(owner, repo, developer);

        return await altinnOrgGitRepository.GetTemplateManifest(cancellationToken);
    }

    private static string GetContentRepoName(string org)
    {
        return $"{org}-content";
    }

}
