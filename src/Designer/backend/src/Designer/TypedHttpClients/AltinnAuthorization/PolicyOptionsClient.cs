#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.Logging;
using PolicyAdmin.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnAuthorization;

public class PolicyOptionsClient : IPolicyOptions
{
    private readonly HttpClient _client;
    private readonly ILogger<PolicyOptionsClient> _logger;
    private readonly PlatformSettings _platformSettings;
    private readonly JsonSerializerOptions _serializerOptions = new JsonSerializerOptions()
    {
        PropertyNameCaseInsensitive = true,
    };

    public PolicyOptionsClient(
        HttpClient httpClient,
        ILogger<PolicyOptionsClient> logger,
        PlatformSettings platformSettings
    )
    {
        _client = httpClient;
        _logger = logger;
        _platformSettings = platformSettings;
    }

    public async Task<List<AccessPackageAreaGroup>> GetAccessPackageOptions(
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        string url = _platformSettings.AccessPackagesUrl;

        List<AccessPackageAreaGroup> accessPackageOptions;

        try
        {
            HttpResponseMessage response = await _client.GetAsync(url, cancellationToken);
            response.EnsureSuccessStatusCode();
            string accessPackageOptionsString = await response.Content.ReadAsStringAsync(cancellationToken);
            accessPackageOptions = JsonSerializer.Deserialize<List<AccessPackageAreaGroup>>(
                accessPackageOptionsString,
                _serializerOptions
            );
            return accessPackageOptions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed retrieving access package options from {Url}", url);
            throw new Exception($"Something went wrong when retrieving access package options", ex);
        }
    }

    public async Task<List<SubjectOption>> GetSubjectOptions(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string rolesUrl = _platformSettings.RolesUrl;

        try
        {
            HttpResponseMessage response = await _client.GetAsync(rolesUrl, cancellationToken);
            response.EnsureSuccessStatusCode();
            string subjectOptionsString = await response.Content.ReadAsStringAsync(cancellationToken);
            List<SubjectOption> subjectOptions =
                JsonSerializer.Deserialize<List<SubjectOption>>(subjectOptionsString, _serializerOptions) ?? [];
            return subjectOptions
                .Where(option => option.IsResourcePolicyAvailable)
                .OrderBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed retrieving Subject options from {Url}", rolesUrl);
            throw new Exception($"Something went wrong when retrieving Subject options", ex);
        }
    }
}
