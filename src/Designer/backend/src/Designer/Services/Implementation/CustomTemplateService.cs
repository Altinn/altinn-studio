using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using NJsonSchema;
using NJsonSchema.Validation;

namespace Altinn.Studio.Designer.Services.Implementation;

public class CustomTemplateService : ICustomTemplateService
{
    private const string SchemaFileName = "templateManifest.schema.json";
    private const string AltinnStudioOrg = "als";
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    public string AppTemplateManifestSchemaLocation { get; } = Path.Combine(AppContext.BaseDirectory, "Schemas", SchemaFileName);

    public CustomTemplateService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
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

        templates.AddRange(await GetTemplateListForPublisher(AltinnStudioOrg, developer, cancellationToken));
   
        return templates;
    }

    public async Task<CustomTemplate> GetCustomTemplate(string developer, string owner, string id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetContentRepoName(owner);

        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(owner, repo, developer);

        return await altinnOrgGitRepository.GetCustomTemplate(id, cancellationToken);
    }


    private async Task<List<CustomTemplate>> GetTemplateListForPublisher(string publisher, string developer, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string repo = GetContentRepoName(publisher);

        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(publisher, repo, developer);

        return await altinnOrgGitRepository.GetTemplateManifest(cancellationToken);
    }

    private static string GetContentRepoName(string org)
    {
        return $"{org}-content";
    }

}
