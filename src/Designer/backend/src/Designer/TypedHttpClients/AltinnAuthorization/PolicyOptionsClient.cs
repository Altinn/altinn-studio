using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.Logging;
using PolicyAdmin.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnAuthorization
{
    public class PolicyOptionsClient : IPolicyOptions
    {
        private readonly HttpClient _client;
        private readonly ILogger<PolicyOptionsClient> _logger;
        private readonly PlatformSettings _platformSettings;
        private readonly JsonSerializerOptions _serializerOptions = new JsonSerializerOptions() { PropertyNameCaseInsensitive = true, };

        public PolicyOptionsClient(HttpClient httpClient, ILogger<PolicyOptionsClient> logger, PlatformSettings platformSettings)
        {
            _client = httpClient;
            _logger = logger;
            _platformSettings = platformSettings;
        }

        public async Task<List<AccessPackageAreaGroup>> GetAccessPackageOptions(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            string url = _platformSettings.AccessPackagesUrl;

            List<AccessPackageAreaGroup> accessPackageOptions;

            try
            {
                HttpResponseMessage response = await _client.GetAsync(url, cancellationToken);
                response.EnsureSuccessStatusCode();
                string accessPackageOptionsString = await response.Content.ReadAsStringAsync(cancellationToken);
                accessPackageOptions = JsonSerializer.Deserialize<List<AccessPackageAreaGroup>>(accessPackageOptionsString, _serializerOptions);
                return accessPackageOptions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed retrieving access package options from {Url}", url);
                throw new Exception($"Something went wrong when retrieving access package options", ex);
            }
        }

        public async Task<List<ActionOption>> GetActionOptions(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            // Temp location. Will be moved to CDN
            string url = "https://raw.githubusercontent.com/Altinn/altinn-studio-docs/master/content/authorization/architecture/resourceregistry/actionoptions.json";

            List<ActionOption> actionOptions;

            try
            {
                HttpResponseMessage response = await _client.GetAsync(url, cancellationToken);
                string actionOptionsString = await response.Content.ReadAsStringAsync(cancellationToken);
                actionOptions = System.Text.Json.JsonSerializer.Deserialize<List<ActionOption>>(actionOptionsString);
                return actionOptions;
            }
            catch (Exception ex)
            {
                throw new Exception($"Something went wrong when retrieving Action options", ex);
            }

        }

        public async Task<List<SubjectOption>> GetSubjectOptions(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string url = "https://raw.githubusercontent.com/Altinn/altinn-studio-docs/master/content/authorization/architecture/resourceregistry/subjectoptions.json";
            string newRolesUrl = _platformSettings.RolesUrl;

            // temp implementation: a flag will be added to the new roles API, which will determine if a role can be used in 
            // policy editor or not. Since this flag is not implemented yet; load the old roles list, and look up each role
            // in the new role API to get return roles in new format (with new descriptions)
            List<SubjectOption> subjectOptions = [];
            List<OldSubjectOption> oldSubjectOptions = [];
            List<SubjectOption> newSubjectOptions = [];

            try
            {
                HttpResponseMessage response = await _client.GetAsync(url, cancellationToken);
                response.EnsureSuccessStatusCode();
                string subjectOptionsString = await response.Content.ReadAsStringAsync(cancellationToken);
                oldSubjectOptions = JsonSerializer.Deserialize<List<OldSubjectOption>>(subjectOptionsString, _serializerOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed retrieving Subject options from {Url}", url);
                throw new Exception($"Something went wrong when retrieving Subject options", ex);
            }

            try
            {
                HttpResponseMessage newResponse = await _client.GetAsync(newRolesUrl, cancellationToken);
                newResponse.EnsureSuccessStatusCode();
                string newSubjectOptionsString = await newResponse.Content.ReadAsStringAsync(cancellationToken);
                newSubjectOptions = JsonSerializer.Deserialize<List<SubjectOption>>(newSubjectOptionsString, _serializerOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed retrieving Subject options from {Url}", url);
                throw new Exception($"Something went wrong when retrieving Subject options", ex);
            }

            oldSubjectOptions.ForEach(oldSubject =>
            {
                string newRoleCode = $"urn:altinn:rolecode:{oldSubject.SubjectId}";
                SubjectOption match = newSubjectOptions.Find(n => string.Equals(n.LegacyUrn, newRoleCode, StringComparison.OrdinalIgnoreCase));
                if (match != null)
                {
                    subjectOptions.Add(match);
                }
            });

            return subjectOptions;
        }
    }
}
