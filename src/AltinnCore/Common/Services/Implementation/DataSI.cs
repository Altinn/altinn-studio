using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml.Serialization;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// implementation for data handling
    /// </summary>
    public class DataSI : IData
    {
        /// <summary>
        /// Insert form for the given instance
        /// </summary>
        /// <typeparam name="T">The input type</typeparam>
        /// <param name="dataToSerialize">The data to serialize</param>
        /// <param name="instanceId">The formId</param>
        /// <param name="type">The type</param>
        /// <param name="applicationOwnerId">The Organization code for the service owner</param>
        /// <param name="applicationId">The service code for the current service</param>
        /// <param name="instanceOwnerId">The partyId</param>
        public async Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId)
        {
            string apiUrl = $"http://localhost:5010/api/v1/instances/{instanceId}/data/boatdata?instanceOwnerId={instanceOwnerId}";
            Instance instance;
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);
                XmlSerializer serializer = new XmlSerializer(type);
                using (MemoryStream stream = new MemoryStream())
                {
                    serializer.Serialize(stream, dataToSerialize);
                    stream.Position = 0;
                    Task<HttpResponseMessage> response = client.PostAsync(apiUrl, new StreamContent(stream));
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to save form model");
                    }

                    string instanceData = await response.Result.Content.ReadAsStringAsync();
                    instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                }
            }

            return instance;
        }

        /// <summary>
        /// update the form 
        /// </summary>
        /// <typeparam name="T">The input type</typeparam>
        /// <param name="dataToSerialize">The data to serialize</param>
        /// <param name="instanceId">The formId</param>
        /// <param name="type">The type</param>
        /// <param name="applicationOwnerId">The Organization code for the service owner</param>
        /// <param name="applicationId">The service code for the current service</param>
        /// <param name="instanceOwnerId">The partyId</param>
        public async Task<Guid> UpdateData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId, Guid dataId)
        {
            string apiUrl = $"http://localhost:5010/api/v1/instances/{instanceId}/?applicationId={applicationId}&instanceOwnerId={instanceOwnerId}";

            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);
                XmlSerializer serializer = new XmlSerializer(type);
                using (MemoryStream stream = new MemoryStream())
                {
                    serializer.Serialize(stream, dataToSerialize);
                    stream.Position = 0;
                    Task<HttpResponseMessage> response = client.PostAsync(apiUrl, new StreamContent(stream));
                    if (!response.Result.IsSuccessStatusCode)
                    {
                        throw new Exception("Unable to save form model");
                    }

                    return Guid.Parse(await response.Result.Content.ReadAsAsync<string>());
                }
            }
        }
    }
}
