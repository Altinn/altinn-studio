using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.ResourceRegistry.Core.Models;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Implementation.Validation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.Logging;

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
        private readonly ILogger<ApplicationInformationService> _logger;

        /// <summary>
        /// Constructor
        /// </summary>
        public ApplicationInformationService(
            IApplicationMetadataService applicationMetadataService,
            IAuthorizationPolicyService authorizationPolicyService,
            ITextResourceService textResourceService,
            IResourceRegistry resourceRegistryService,
            IOrgService orgService,
            ILogger<ApplicationInformationService> logger
        )
        {
            _applicationMetadataService = applicationMetadataService;
            _authorizationPolicyService = authorizationPolicyService;
            _textResourceService = textResourceService;
            _resourceRegistryService = resourceRegistryService;
            _orgService = orgService;
            _logger = logger;
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
            using var activity = ServiceTelemetry.Source.StartActivity(
                "PublishAltinnAppServiceResource",
                ActivityKind.Internal
            );
            activity?.SetTag("org", org);
            activity?.SetTag("app", app);
            activity?.SetTag("env", envName);

            try
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

                ActionResult publishResponse =
                    await _resourceRegistryService.PublishServiceResource(serviceResource, envName);

                if (
                    publishResponse
                    is ObjectResult { Value: ValidationProblemDetails validationProblemDetails }
                )
                {
                    string errors = string.Join(
                        "; ",
                        validationProblemDetails.Errors.SelectMany(e =>
                            e.Value.Select(v => $"{e.Key}: {v}")
                        )
                    );
                    activity?.SetTag("publish.result", "validation_error");
                    activity?.SetStatus(
                        ActivityStatusCode.Error,
                        "Validation errors from Resource Registry"
                    );
                    activity?.AddEvent(
                        new ActivityEvent(
                            "validation_problems",
                            tags: new ActivityTagsCollection { { "validation.errors", errors } }
                        )
                    );
                    _logger.LogWarning(
                        "Resource Registry returned validation problems for {Org}/{App}: {Errors}",
                        org,
                        app,
                        errors
                    );
                    return;
                }

                if (publishResponse is StatusCodeResult { StatusCode: 200 or 201 })
                {
                    activity?.SetTag("publish.result", "success");
                    return;
                }

                int? statusCode = (publishResponse as IStatusCodeActionResult)?.StatusCode;
                activity?.SetTag("publish.result", "unexpected_response");
                activity?.SetTag("publish.status_code", statusCode);
                activity?.SetStatus(
                    ActivityStatusCode.Error,
                    $"Unexpected response status: {statusCode}"
                );
                _logger.LogWarning(
                    "Resource Registry returned unexpected response for {Org}/{App}: {StatusCode}",
                    org,
                    app,
                    statusCode
                );
            }
            catch (Exception ex)
            {
                activity?.SetTag("publish.result", "exception");
                activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                activity?.AddException(ex);
                _logger.LogWarning(
                    ex,
                    "Publishing to Resource Registry failed for {Org}/{App}",
                    org,
                    app
                );
            }
        }
    }
}
