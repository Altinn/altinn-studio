using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
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
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// implementation for data handling
    /// </summary>
    public class DataAppSI : IData
    {
        private readonly PlatformSettings _platformSettings;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtCookieOptions _cookieOptions;
        private readonly HttpClient _client;

        private const string FORM_ID = "default";

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
        public async Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId)
        {
            string apiUrl = $"instances/{instanceId}/data?formId={FORM_ID}&instanceOwnerId={instanceOwnerId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            Instance instance;

            _client.DefaultRequestHeaders.Accept.Clear();
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));

            if (_client.DefaultRequestHeaders.Contains("Authorization"))
            {
                _client.DefaultRequestHeaders.Remove("Authentication");
            }

            _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

            XmlSerializer serializer = new XmlSerializer(type);
            using (MemoryStream stream = new MemoryStream())
            {
                serializer.Serialize(stream, dataToSerialize);
                stream.Position = 0;
                StreamContent streamContent = new StreamContent(stream);
                streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");
                Task<HttpResponseMessage> response = _client.PostAsync(apiUrl, streamContent);
                if (!response.Result.IsSuccessStatusCode)
                {
                    _logger.Log(LogLevel.Error, "unable to save form data for instance{0} due to response {1}", instanceId, response.Result.StatusCode);
                    return null;
                }

                string instanceData = await response.Result.Content.ReadAsStringAsync();
                instance = JsonConvert.DeserializeObject<Instance>(instanceData);
            }

            return instance;
        }

        /// <inheritdoc />
        public void UpdateData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId, Guid dataId)
        {
            string apiUrl = $"instances/{instanceId}/data/{dataId}?instanceOwnerId={instanceOwnerId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            _client.DefaultRequestHeaders.Accept.Clear();

            if (_client.DefaultRequestHeaders.Contains("Authorization"))
            {
                _client.DefaultRequestHeaders.Remove("Authentication");
            }

            _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

            XmlSerializer serializer = new XmlSerializer(type);
            using (MemoryStream stream = new MemoryStream())
            {
                serializer.Serialize(stream, dataToSerialize);
                stream.Position = 0;
                StreamContent streamContent = new StreamContent(stream);
                streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");

                if (_client.DefaultRequestHeaders.Contains("Authorization"))
                {
                    _client.DefaultRequestHeaders.Remove("Authentication");
                }

                _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);
                Task<HttpResponseMessage> response = _client.PutAsync(apiUrl, streamContent);
                if (!response.Result.IsSuccessStatusCode)
                {
                    _logger.LogError($"Unable to save form model for instance {instanceId}");
                }
            }
        }

        /// <inheritdoc />
        public object GetFormData(Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId, Guid dataId)
        {
            string apiUrl = $"instances/{instanceId}/data/{dataId}?instanceOwnerId={instanceOwnerId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);

            if (_client.DefaultRequestHeaders.Contains("Authorization"))
            {
                _client.DefaultRequestHeaders.Remove("Authentication");
            }

            _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

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
        public async Task<List<AttachmentList>> GetFormAttachments(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId)
        {
            List<Data> dataList = null;
            List<AttachmentList> attachmentList = new List<AttachmentList>();
            List<Attachment> attachments = null;
            string apiUrl = $"instances/{instanceId}/data?instanceOwnerId={instanceOwnerId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);

            if (_client.DefaultRequestHeaders.Contains("Authorization"))
            {
                _client.DefaultRequestHeaders.Remove("Authentication");
            }

            _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

            HttpResponseMessage response = await _client.GetAsync(apiUrl);
            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                dataList = JsonConvert.DeserializeObject<List<Data>>(instanceData);

                IEnumerable<Data> attachmentTypes = dataList.GroupBy(m => m.FormId).Select(m => m.FirstOrDefault());

                foreach (Data attachmentType in attachmentTypes)
                {
                    attachments = new List<Attachment>();
                    foreach (Data data in dataList)
                    {
                        if (data.FormId != "default" && data.FormId == attachmentType.FormId)
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
                        attachmentList.Add(new AttachmentList { Type = attachmentType.FormId, Attachments = attachments });
                    }
                }

                if (attachments != null && attachments.Count > 0)
                {
                    attachmentList.Add(new AttachmentList { Type = "attachments", Attachments = attachments });
                }
            }
            else
            {
                _logger.Log(LogLevel.Error, "Unable to fetch attachment list{0}", response.StatusCode);
            }

            return attachmentList;
        }

        /// <inheritdoc />
        public void DeleteFormAttachment(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId, string attachmentType, string attachmentId)
        {
            List<AttachmentList> attachmentList = new List<AttachmentList>();
            string apiUrl = $"instances/{instanceId}/data/{attachmentId}?instanceOwnerId={instanceOwnerId}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);

            if (_client.DefaultRequestHeaders.Contains("Authorization"))
            {
                _client.DefaultRequestHeaders.Remove("Authentication");
            }

            _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

            Task<HttpResponseMessage> response = _client.DeleteAsync(apiUrl);
            response.Result.EnsureSuccessStatusCode();
        }

        /// <inheritdoc />
        public async Task<Guid> SaveFormAttachment(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId, string attachmentType, string attachmentName, HttpRequest attachment)
        {
            string apiUrl = $"instances/{instanceId}/data?formId={attachmentType}&instanceOwnerId={instanceOwnerId}&attachmentName={attachmentName}";
            string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _cookieOptions.Cookie.Name);
            Instance instance;

            FileExtensionContentTypeProvider provider = new FileExtensionContentTypeProvider();
            string contentType;
            provider.TryGetContentType(attachmentName, out contentType);

            _client.DefaultRequestHeaders.Accept.Clear();
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue(contentType));

            if (_client.DefaultRequestHeaders.Contains("Authorization"))
            {
                _client.DefaultRequestHeaders.Remove("Authentication");
            }

            _client.DefaultRequestHeaders.Add("Authorization", "Bearer " + token);

            using (Stream input = attachment.Body)
            {
                HttpContent fileStreamContent = new StreamContent(input);

                using (MultipartFormDataContent formData = new MultipartFormDataContent())
                {
                    fileStreamContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
                    ContentDispositionHeaderValue header = new ContentDispositionHeaderValue("form-data");
                    header.FileName = attachmentName;
                    header.Size = attachment.ContentLength;
                    formData.Headers.ContentDisposition = header;
                    formData.Headers.Add("Authorization", "Bearer " + token);
                    formData.Add(fileStreamContent, attachmentType, attachmentName);
                    HttpResponseMessage response = _client.PostAsync(apiUrl, formData).Result;

                    response.EnsureSuccessStatusCode();

                    string instancedata = await response.Content.ReadAsStringAsync();
                    instance = JsonConvert.DeserializeObject<Instance>(instancedata);
                    return Guid.Parse(instance.Data.Find(m => m.FileName.Equals(attachmentName)).Id);
                }
            }
        }
    }
}
