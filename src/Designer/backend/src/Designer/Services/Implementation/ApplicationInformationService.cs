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
        public async Task UpdateApplicationInformationAsync(
            string org,
            string app,
            string shortCommitId,
            string envName,
            CancellationToken cancellationToken = default
        )
        {
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

            await PublishAltinnAppServiceResource(org, app, shortCommitId, envName);
        }

        private async Task PublishAltinnAppServiceResource(
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

            try
            {
                ActionResult publishResponse =
                    await _resourceRegistryService.PublishServiceResource(serviceResource, envName);
            }
            catch (System.Exception) { }
            // TODO: Publishing to Resource Registry is currently optional, but will be non-optional in the future.
            // This code is commented to not stop the normal publication if resource registry publication fails
            // if (
            //     publishResponse is ObjectResult
            //     {
            //         Value: ValidationProblemDetails validationProblemDetails
            //     }
            // )
            // {
            //     string message = string.Join(
            //         ". ",
            //         validationProblemDetails.Errors.Values.SelectMany(v => v)
            //     );
            //     throw new ResourceRegistryPublishingException(message ?? string.Empty);
            // }
            //
            // if (publishResponse is not StatusCodeResult { StatusCode: 201 or 200 })
            // {
            //     throw new ResourceRegistryPublishingException();
            // }
        }
    }
}
