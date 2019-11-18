using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.Platform.Storage.Models;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Utils;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// App implementation of the data handling service.
    /// </summary>
    public class DataAppSI : IData
    {
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _client;

        private const string FORM_ID = "default";

        private static readonly ConcurrentDictionary<object, SemaphoreSlim> _instanceLocks = new ConcurrentDictionary<object, SemaphoreSlim>();

        /// <summary>
        /// Initializes a new data of the <see cref="DataAppSI"/> class.
        /// </summary>
        /// <param name="platformSettings">the platform settings</param>
        /// <param name="logger">the logger</param>
        /// <param name="httpContextAccessor">The http context accessor </param>
        /// <param name="cookieOptions">The cookie options </param>
        /// <param name="httpClientAccessor">The http client accessor </param>
        public DataAppSI(
            IOptions<PlatformSettings> platformSettings,
            ILogger<DataAppSI> logger,
            IHttpContextAccessor httpContextAccessor,
            IOptions<JwtCookieOptions> cookieOptions,
            IHttpClientAccessor httpClientAccessor)
        {
            _platformSettings = platformSettings.Value;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _cookieOptions = cookieOptions.Value;
            _client = httpClientAccessor.StorageClient;
        }

        /// <inheritdoc />
        public async Task<Instance> InsertFormData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data?elementType={FORM_ID}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);
            Instance instance;

            using (MemoryStream stream = new MemoryStream())
            {
                XmlSerializer serializer = new XmlSerializer(type);
                serializer.Serialize(stream, dataToSerialize);
                stream.Position = 0;

                StreamContent streamContent = new StreamContent(stream);
                streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");
                Task<HttpResponseMessage> response = _client.PostAsync(apiUrl, streamContent);
                if (!response.Result.IsSuccessStatusCode)
                {
                    _logger.Log(LogLevel.Error, "unable to save form data for instance{0} due to response {1}", instanceGuid, response.Result.StatusCode);
                    return null;
                }

                string instanceData = await response.Result.Content.ReadAsStringAsync();
                instance = JsonConvert.DeserializeObject<Instance>(instanceData);
            }

            return instance;
        }

        /// <inheritdoc />
        public async Task<Instance> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            XmlSerializer serializer = new XmlSerializer(type);
            using (MemoryStream stream = new MemoryStream())
            {
                serializer.Serialize(stream, dataToSerialize);
                stream.Position = 0;
                StreamContent streamContent = new StreamContent(stream);
                streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");

                Task<HttpResponseMessage> response = _client.PutAsync(apiUrl, streamContent);
                if (!response.Result.IsSuccessStatusCode)
                {
                    _logger.LogError($"Unable to save form model for instance {instanceGuid}");
                }

                string instanceData = await response.Result.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                return instance;
            }
        }

        /// <inheritdoc />
        public Task<Stream> GetBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            HttpResponseMessage response = _client.GetAsync(apiUrl).Result;

            if (response.IsSuccessStatusCode)
            {
                return response.Content.ReadAsStreamAsync();
            }

            return null;
        }

        /// <inheritdoc />
        public object GetFormData(Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            Task<HttpResponseMessage> response = _client.GetAsync(apiUrl);
            if (response.Result.IsSuccessStatusCode)
            {
                XmlSerializer serializer = new XmlSerializer(type);
                try
                {
                    using (Stream stream = response.Result.Content.ReadAsStreamAsync().Result)
                    {
                        return serializer.Deserialize(stream);
                    }
                }
                catch
                {
                    return Activator.CreateInstance(type);
                }
            }
            else
            {
                return Activator.CreateInstance(type);
            }
        }

        /// <inheritdoc />
        public async Task<List<AttachmentList>> GetBinaryDataList(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            List<DataElement> dataList = null;
            List<AttachmentList> attachmentList = new List<AttachmentList>();

            HttpResponseMessage response = await _client.GetAsync(apiUrl);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                dataList = JsonConvert.DeserializeObject<List<DataElement>>(instanceData);

                ExtractAttachments(dataList, attachmentList);
            }
            else
            {
                _logger.Log(LogLevel.Error, "Unable to fetch attachment list {0}", response.StatusCode);
            }

            return attachmentList;
        }

        private static void ExtractAttachments(List<DataElement> dataList, List<AttachmentList> attachmentList)
        {
            List<Attachment> attachments = null;
            IEnumerable<DataElement> attachmentTypes = dataList.GroupBy(m => m.ElementType).Select(m => m.FirstOrDefault());

            foreach (DataElement attachmentType in attachmentTypes)
            {
                attachments = new List<Attachment>();
                foreach (DataElement data in dataList)
                {
                    if (data.ElementType != "default" && data.ElementType == attachmentType.ElementType)
                    {
                        attachments.Add(new Attachment
                        {
                            Id = data.Id,
                            Name = data.FileName,
                            Size = data.FileSize
                        });
                    }
                }

                if (attachments.Count > 0)
                {
                    attachmentList.Add(new AttachmentList { Type = attachmentType.ElementType, Attachments = attachments });
                }
            }

            if (attachments != null && attachments.Count > 0)
            {
                attachmentList.Add(new AttachmentList { Type = "attachments", Attachments = attachments });
            }
        }

        /// <inheritdoc />
        public async Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"instances/{instanceIdentifier}/data/{dataGuid}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            JwtTokenUtil.AddTokenToRequestHeader(_client, token);

            // Waiting for the instance and subsequently locking it.
            SemaphoreSlim instanceLock = _instanceLocks.GetOrAdd(instanceGuid, k => new SemaphoreSlim(1, 1));
            await instanceLock.WaitAsync();

            try
            {
                HttpResponseMessage response = await _client.DeleteAsync(apiUrl);

                if (response.IsSuccessStatusCode)
                {
                    return true;
                }
                else
                {
                    _logger.LogError($"Deleting form attachment {dataGuid} for instance {instanceGuid} failed with status code {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Deleting form attachment {dataGuid} for instance {instanceGuid} failed. Exception message: {ex.Message}");
            }
            finally
            {
                instanceLock.Release();
            }

            return false;
        }

        private static StreamContent CreateContentStream(HttpRequest request)
        {
            StreamContent content = new StreamContent(request.Body);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse(request.ContentType);

            if (request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
            {
                content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse(headerValues.ToString());
            }

            return content;
        }

        /// <inheritdoc />
        public async Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, string elementType, string attachmentName, HttpRequest request)
        {
                StreamContent content = CreateContentStream(request);
                return await InsertBinaryDataFromStreamContent(org, app, instanceOwnerId, instanceGuid, elementType, attachmentName, content);
        }

        /// <inheritdoc />
        public async Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, string elementType, string attachmentName, StreamContent content)
        {
            return await InsertBinaryDataFromStreamContent(org, app, instanceOwnerId, instanceGuid, elementType, attachmentName, content);
        }

        private async Task<DataElement> InsertBinaryDataFromStreamContent(string org, string app, int instanceOwnerId, Guid instanceGuid, string elementType, string attachmentName, StreamContent content)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceIdentifier}/data?elementType={elementType}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            Instance instance;

            FileExtensionContentTypeProvider provider = new FileExtensionContentTypeProvider();
            provider.TryGetContentType(attachmentName, out string contentType);

            // Waiting for the instance and subsequently locking it.
            SemaphoreSlim instanceLock = _instanceLocks.GetOrAdd(instanceGuid, k => new SemaphoreSlim(1, 1));
            await instanceLock.WaitAsync();

            try
            {
                JwtTokenUtil.AddTokenToRequestHeader(_client, token);

                HttpResponseMessage response = await _client.PostAsync(apiUrl, content);

                if (response.IsSuccessStatusCode)
                {
                    string instancedata = await response.Content.ReadAsStringAsync();
                    instance = JsonConvert.DeserializeObject<Instance>(instancedata);

                    return instance.Data.Find(m => m.ElementType.Equals(elementType));
                }
                else
                {
                    _logger.LogError($"Storing attachment {attachmentName} for instance {instanceGuid} failed with status code {response.StatusCode}");
                }
            }
            catch (Exception e)
            {
                _logger.LogError($"Storing attachment {attachmentName} for instance {instanceGuid} failed. Exception message: {e.Message}");
            }
            finally
            {
                instanceLock.Release();
            }

            return null;
        }

        /// <inheritdoc />
        public async Task<DataElement> UpdateBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid, HttpRequest request)
        {
            string instanceIdentifier = $"{instanceOwnerId}/{instanceGuid}";
            string apiUrl = $"{_platformSettings.GetApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            Instance instance;

            // Waiting for the instance and subsequently locking it.
            SemaphoreSlim instanceLock = _instanceLocks.GetOrAdd(instanceGuid, k => new SemaphoreSlim(1, 1));
            await instanceLock.WaitAsync();

            try
            {
                StreamContent content = CreateContentStream(request);

                JwtTokenUtil.AddTokenToRequestHeader(_client, token);

                HttpResponseMessage response = await _client.PutAsync(apiUrl, content);

                if (response.IsSuccessStatusCode)
                {
                    string instancedata = response.Content.ReadAsStringAsync().Result;
                    instance = JsonConvert.DeserializeObject<Instance>(instancedata);

                    return instance.Data.Find(d => d.Id.Equals(dataGuid.ToString()));
                }
                else
                {
                    _logger.LogError($"Updating attachment {dataGuid} for instance {instanceGuid} failed with status code {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Updating attachment {dataGuid} for instance {instanceGuid} failed. Exception message: {ex.Message}");
            }
            finally
            {
                instanceLock.Release();
            }

            return null;
        }
    }
}
