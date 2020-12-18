using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Constants;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Microsoft.Extensions.Options;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// Represents a service that can initiate PDF generation.
    /// </summary>
    public class PDFSI : IPDF
    {
        private readonly HttpClient _pdfClient;
        private readonly JsonSerializer _camelCaseSerializer;

        /// <summary>
        /// Creates a new instance of the <see cref="PDFSI"/> class
        /// </summary>
        /// <param name="platformSettings">The platform settingssettings</param>
        /// <param name="httpClient">The http client</param>
        public PDFSI(
            IOptions<PlatformSettings> platformSettings,
            HttpClient httpClient)
        {
            _camelCaseSerializer = JsonSerializer.Create(
                new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });

            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiPdfEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            _pdfClient = httpClient;
        }

        /// <inheritdoc/>
        public async Task<Stream> GeneratePDF(PDFContext pdfContext)
        {
            using HttpContent data = new StringContent(JObject.FromObject(pdfContext, _camelCaseSerializer).ToString(), Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _pdfClient.PostAsync("generate", data);
            response.EnsureSuccessStatusCode();
            Stream pdfContent = await response.Content.ReadAsStreamAsync();
            return pdfContent;
        }
    }
}
