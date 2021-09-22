using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Common.EFormidlingClient.Configuration;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.EFormidlingClient.Models;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Common.EFormidlingClient
{
    /// <summary>
    /// Represents an implementation of <see cref="EFormidlingClient"/> using a HttpClient.
    /// </summary>
    public class EFormidlingClient : IEFormidlingClient
    {
        private readonly HttpClient _client;
        private readonly ILogger<EFormidlingClient> _logger;
        private readonly IOptions<EFormidlingClientSettings> _eformidlingSettings;

        /// <summary>
        /// Initializes a new instance of the IFormidlingClient class with the given HttpClient, lSettings and Logger.
        /// </summary>
        /// <param name="httpClient">A HttpClient provided by a HttpClientFactory.</param>
        /// <param name="eformidlingSettings">The settings configured for eFormidling package</param>
        /// <param name="logger">Logging</param>
        public EFormidlingClient(HttpClient httpClient, IOptions<EFormidlingClientSettings> eformidlingSettings, ILogger<EFormidlingClient> logger = null)
        {
            _client = httpClient ?? throw new ArgumentNullException("httpClient");
            _eformidlingSettings = eformidlingSettings ?? throw new ArgumentNullException("eformidlingSettings");
            _logger = logger ?? throw new ArgumentNullException("logger");

            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client.BaseAddress = new Uri(_eformidlingSettings.Value.BaseUrl);
        }

        /// <inheritdoc/>
        public async Task<bool> SendMessage(string id)
        {
            if (string.IsNullOrEmpty(id))
            {
                throw new ArgumentNullException(nameof(id));
            }

            try
            {
                HttpResponseMessage res = await _client.PostAsync($"messages/out/{id}", null);

                if (!res.IsSuccessStatusCode)
                {
                    string contentString = await res.Content.ReadAsStringAsync();
                    _logger.LogError($"// EformidlingClient // SendMessage // {contentString}");
                    return false;
                }

                return true;
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{Exception} ", e.Message);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task FindOutGoingMessages(string serviceIdentifier)
        {
            string responseBody;

            if (string.IsNullOrEmpty(serviceIdentifier))
            {
                throw new ArgumentNullException(nameof(serviceIdentifier));
            }

            try
            {
                HttpResponseMessage response = await _client.GetAsync($"messages/out/?serviceIdentifier={serviceIdentifier}");
                responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogDebug(responseBody);
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{Exception} ", e.Message);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<Statuses> GetAllMessageStatuses()
        {
            string responseBody;
            try
            {
                HttpResponseMessage response = await _client.GetAsync($"statuses");
                responseBody = await response.Content.ReadAsStringAsync();
                Statuses allMessageStatuses = JsonSerializer.Deserialize<Statuses>(responseBody);
                _logger.LogDebug(responseBody);

                return allMessageStatuses;
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{Exception} ", e.Message);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<Capabilities> GetCapabilities(string orgId)
        {
            string responseBody;

            if (string.IsNullOrEmpty(orgId))
            {
                throw new ArgumentNullException(nameof(orgId));
            }

            try
            {
                HttpResponseMessage response = await _client.GetAsync($"capabilities/{orgId}");
                responseBody = await response.Content.ReadAsStringAsync();
                Capabilities capabilities = JsonSerializer.Deserialize<Capabilities>(responseBody);
                _logger.LogDebug(responseBody);

                return capabilities;
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{Exception} ", e.Message);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<Conversation> GetAllConversations()
        {
            string responseBody;
            try
            {
                HttpResponseMessage response = await _client.GetAsync($"conversations");
                responseBody = await response.Content.ReadAsStringAsync();
                Conversation conversations = JsonSerializer.Deserialize<Conversation>(responseBody);
                _logger.LogDebug(responseBody);

                return conversations;
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{Exception} ", e.Message);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<Conversation> GetConversationById(string id)
        {
            string responseBody;

            if (string.IsNullOrEmpty(id))
            {
                throw new ArgumentNullException(nameof(id));
            }

            try
            {
                HttpResponseMessage response = await _client.GetAsync($"conversations/{id}");
                responseBody = await response.Content.ReadAsStringAsync();
                Conversation conversation = JsonSerializer.Deserialize<Conversation>(responseBody);
                _logger.LogDebug(responseBody);

                return conversation;
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{Exception} ", e.Message);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<Conversation> GetConversationByMessageId(string id)
        {
            string responseBody;

            if (string.IsNullOrEmpty(id))
            {
                throw new ArgumentNullException(nameof(id));
            }

            try
            {
                HttpResponseMessage response = await _client.GetAsync($"conversations/messageId/{id}");
                responseBody = await response.Content.ReadAsStringAsync();
                Conversation conversation = JsonSerializer.Deserialize<Conversation>(responseBody);
                _logger.LogDebug(responseBody);

                return conversation;
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{Exception} ", e.Message);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<Statuses> GetMessageStatusById(string id)
        {
            string responseBody;

            if (string.IsNullOrEmpty(id))
            {
                throw new ArgumentNullException(nameof(id));
            }

            try
            {
                HttpResponseMessage response = await _client.GetAsync($"statuses?messageId={id}");
                responseBody = await response.Content.ReadAsStringAsync();
                Statuses status = JsonSerializer.Deserialize<Statuses>(responseBody);
                _logger.LogDebug(responseBody);

                return status;
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{Exception} ", e.Message);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<bool> UploadAttachment(Stream stream, string id, string filename)
        {
            if (string.IsNullOrEmpty(id))
            {
                throw new ArgumentNullException(nameof(id));
            }

            if (string.IsNullOrEmpty(filename))
            {
                throw new ArgumentNullException(nameof(filename));
            }

            if (stream == null)
            {
                throw new ArgumentNullException(nameof(stream));
            }

            var streamContent = new StreamContent(stream);
            streamContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
            {
                Name = "attachment",
                FileName = filename
            };
            streamContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

            HttpResponseMessage response = await _client.PutAsync($"messages/out/{id}?title={filename}", streamContent);
            response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            if (response.Content == null)
            {
                response.Content = new StringContent(string.Empty);
            }

            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                return true;
            }
            else
            {
                _logger.LogError($"The remote server returned unexpcted status code: {response.StatusCode} - {responseBody}.");
                throw new WebException($"The remote server returned unexpcted status code: {response.StatusCode} - {responseBody}.");
            }
        }

        /// <inheritdoc/>
        public async Task<StandardBusinessDocument> CreateMessage(StandardBusinessDocument sbd)
        {
            if (sbd == null)
            {
                throw new ArgumentNullException(nameof(sbd));
            }

            var jsonContent = JsonSerializer.Serialize(sbd);
            byte[] buffer = Encoding.UTF8.GetBytes(jsonContent);
            ByteArrayContent byteContent = new ByteArrayContent(buffer);

            byteContent.Headers.Remove("Content-Type");
            byteContent.Headers.Add("Content-Type", "application/json");
            _logger.LogDebug(jsonContent);

            string responseBody = null;
            try
            {
                HttpResponseMessage response = await _client.PostAsync("messages/out", byteContent);
                responseBody = await response.Content.ReadAsStringAsync();
                response.EnsureSuccessStatusCode();
                StandardBusinessDocument sbdVerified = JsonSerializer.Deserialize<StandardBusinessDocument>(responseBody);
                _logger.LogDebug(responseBody);

                return sbdVerified;
            }
            catch (HttpRequestException)
            {
                throw new WebException($"The remote server returned an unexpcted error: {responseBody}.");
            }
            catch (Exception ex)
            {
                _logger.LogError("Message :{Exception} ", ex.Message);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<bool> SubscribeeFormidling(CreateSubscription subscription)
        {
            if (subscription == null)
            {
                throw new ArgumentNullException(nameof(subscription));
            }

            string responseBody = null;
            try
            {
                var jsonString = JsonSerializer.Serialize(subscription);
                var stringContent = new StringContent(jsonString, Encoding.UTF8, "application/json");

                HttpResponseMessage response = await _client.PostAsync($"subscriptions", stringContent);
                responseBody = await response.Content.ReadAsStringAsync();
                response.EnsureSuccessStatusCode();

                if (response.StatusCode == HttpStatusCode.OK)
                {
                    return true;
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError("Message :{Exception} ", ex.Message);
                throw new WebException($"The remote server returned an unexpected error: {responseBody}.");
            }

            return false;
        }

        /// <inheritdoc/>
        public async Task<bool> UnSubscribeeFormidling(int id)
        {
            if (id <= 0)
            {
                throw new ArgumentNullException(nameof(id));
            }

            string responseBody;

            try
            {
                HttpResponseMessage response = await _client.DeleteAsync($"subscriptions/{id}");
                responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogDebug(responseBody);

                if (response.StatusCode == HttpStatusCode.OK)
                {
                    return true;
                }
            }
            catch (HttpRequestException e)
            {
                _logger.LogError("Message :{Exception} ", e.Message);
                throw;
            }

            return false;
        }
    }
}
