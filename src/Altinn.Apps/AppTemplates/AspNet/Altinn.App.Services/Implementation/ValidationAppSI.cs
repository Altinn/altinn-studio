using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// service implementation for application in application container mode
    /// </summary>
    public class ValidationAppSI : IValidation
    {
        private readonly ILogger _logger;
        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationAppSI"/> class.
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="httpClientAccessor">The Http client accessor </param>
        public ValidationAppSI(
            ILogger<ApplicationAppSI> logger,
            IHttpClientAccessor httpClientAccessor)
        {
            _logger = logger;
            _client = httpClientAccessor.StorageClient;
        }

        public Task<System.Collections.Generic.List<ValidationIssue>> ValidateAndUpdateInstance(string org, string app, int instanceOwnerPartyId, Guid instanceId, Instance instance, string taskId)
        {
            throw new NotImplementedException();
        }
    }
}
