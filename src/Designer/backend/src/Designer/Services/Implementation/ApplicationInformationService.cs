using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.ResourceRegistry.Core.Models;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Implementation.Validation;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using JsonException = Newtonsoft.Json.JsonException;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// ApplicationInformationService
    /// </summary>
    public class ApplicationInformationService : IApplicationInformationService
    {
        private readonly IApplicationMetadataService _applicationMetadataService;
        private readonly IAuthorizationPolicyService _authorizationPolicyService;
        private readonly ITextResourceService _textResourceService;
        private readonly IResourceRegistry _resourceRegistryService;
        private readonly IOrgService _orgService;

        /// <summary>
        /// Constructor
        /// </summary>
        public ApplicationInformationService(
            IApplicationMetadataService applicationMetadataService,
            IAuthorizationPolicyService authorizationPolicyService,
            ITextResourceService textResourceService,
            IResourceRegistry resourceRegistryService,
            IOrgService orgService
        )
        {
            _applicationMetadataService = applicationMetadataService;
            _authorizationPolicyService = authorizationPolicyService;
            _textResourceService = textResourceService;
            _resourceRegistryService = resourceRegistryService;
            _orgService = orgService;
        }

        private static readonly JsonSerializerOptions s_jsonOptions = new()
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        /// <inheritdoc />
        public async Task<ActionResult> UpdateApplicationInformationAsync(
            string org,
            string app,
            string shortCommitId,
            string envName,
            bool publishServiceResource,
            CancellationToken cancellationToken = default
        )
        {
            System.Console.WriteLine($"Updating application information");
            cancellationToken.ThrowIfCancellationRequested();
            await _applicationMetadataService.UpdateApplicationMetadataInStorageAsync(
                org,
                app,
                shortCommitId,
                envName,
                cancellationToken
            );

            Task updateAuthPolicyTask =
                _authorizationPolicyService.UpdateApplicationAuthorizationPolicyAsync(
                    org,
                    app,
                    shortCommitId,
                    envName,
                    cancellationToken
                );

            Task updateTextResources = _textResourceService.UpdateTextResourcesAsync(
                org,
                app,
                shortCommitId,
                envName,
                cancellationToken
            );

            await Task.WhenAll(new List<Task> { updateAuthPolicyTask, updateTextResources });

            // Publish service resource after policy
            System.Console.WriteLine(
                $"Publishing service resource for {org}/{app}/{shortCommitId}"
            );
            // TODO: publish policy with `PublishServiceResource` policyPath, requires renaming of rules like above probably
            if (envName == "tt02" && publishServiceResource)
            {
                var result = await PublishAltinnAppServiceResource(org, app, shortCommitId, envName);
                return result;
            }
            return new CreatedResult();
        }

        private async Task<ActionResult> PublishAltinnAppServiceResource(
            string org,
            string app,
            string shortCommitId,
            string envName
        )
        {
            string appMetadataJson =
                await _applicationMetadataService.GetApplicationMetadataJsonFromSpecificReference(
                    org,
                    app,
                    shortCommitId
                );
            ApplicationMetadata? applicationMetadata =
                JsonSerializer.Deserialize<ApplicationMetadata>(appMetadataJson, s_jsonOptions)
                ?? throw new JsonException("Could not deserialize application metadata");

            ServiceResource serviceResource = applicationMetadata.ToServiceResource();
            Org orgListOrg = await _orgService.GetOrg(org);
            serviceResource.HasCompetentAuthority = new()
            {
                Name = orgListOrg.Name,
                Organization = orgListOrg.Orgnr,
                Orgcode = org,
            };

            ActionResult publishResponse = await _resourceRegistryService.PublishServiceResource(
                serviceResource,
                envName
            );
            if (
                publishResponse is StatusCodeResult statusCodeResult
                && statusCodeResult.StatusCode == 201
            )
            {
                return new CreatedResult();
            }

            return publishResponse;
        }
    }
}
