using System;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Events.Functions.Models;
using Altinn.Platform.Events.Functions.Services.Interfaces;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Functions.Services
{
    /// <summary>
    /// Handles pushevents service
    /// </summary>
    public class PushEventsService : IPushEventsService
    {
        private readonly HttpClient _client;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IAccessTokenGenerator _accessTokenGenerator;
        private readonly ILogger<IPushEventsService> _logger;
        
        /// <summary>
        /// Initializes a new instance of the <see cref="PushEventsService"/> class.
        /// </summary>
        public PushEventsService(
            HttpClient httpClient,
            IHttpContextAccessor httpContextAccessor,
            IAccessTokenGenerator accessTokenGenerator,
            ILogger<IPushEventsService> logger)
        {
            httpClient.BaseAddress = new Uri(Environment.GetEnvironmentVariable("ApiPushEventsEndpoint"));
            _client = httpClient;
            _httpContextAccessor = httpContextAccessor;
            _accessTokenGenerator = accessTokenGenerator;
            _logger = logger;
        }

        /// <inheritdoc/>
        public Task SendToPushController(CloudEvent item)
        {
            string token = JwtTokenUtil.GetTokenFromContext(
                _httpContextAccessor.HttpContext,
                Environment.GetEnvironmentVariable("JwtCookieName"));
            string accessToken = _accessTokenGenerator.GenerateAccessToken("platform", "events");
            throw new System.NotImplementedException();
        }
    }
}
