using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for instance
    /// </summary>
    public class InstanceSI : IInstance
    {
        /// <summary>
        /// This method creates new instance in database
        /// </summary>
        public async Task<Guid> InstantiateInstance(string applicationId, string instanceOwnerId)
        {
            Guid instanceId;
            using (HttpClient client = new HttpClient())
            {
                string apiUrl = $"http://localhost:5010/api/v1/instances/?applicationId={applicationId}&instanceOwnerId={instanceOwnerId}";
                client.BaseAddress = new Uri(apiUrl);
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                try
                {
                    //MemoryStream formDataStream = new MemoryStream();

                    //var jsonData = JsonConvert.SerializeObject(dataToSerialize);
                    //StreamWriter writer = new StreamWriter(formDataStream);
                    //writer.Write(jsonData);
                    //writer.Flush();
                    //formDataStream.Position = 0;
                    //var httpcontent = new StringContent(jsonData, Encoding.UTF8, "application/json");

                    //HttpResponseMessage response = await client.PostAsync(apiUrl, new StreamContent(formDataStream));
                    HttpResponseMessage response = await client.PostAsync(apiUrl, null);
                    string id = await response.Content.ReadAsAsync<string>();
                    instanceId = Guid.Parse(id);
                    return instanceId;
                }
                catch
                {
                    return Guid.Parse(string.Empty);
                }                
            }
        }

        /// <summary>
        /// Gets the instance
        /// </summary>
        /// <param name="applicationId">the application id</param>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <param name="instanceId">the instance id</param>
        /// <returns></returns>
        public async Task<Instance> GetInstance(string applicationId, string instanceOwnerId, Guid instanceId)
        {
            Instance instance;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Instance));
            string apiUrl = $"http://localhost:5010/api/v1/instances/instanceId:guid/{instanceId}/?instanceOwnerId={instanceOwnerId}";
            using (HttpClient client = new HttpClient())
            {
                client.BaseAddress = new Uri(apiUrl);

                HttpResponseMessage response = await client.GetAsync(apiUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string instanceData = await response.Content.ReadAsStringAsync();
                    instance = JsonConvert.DeserializeObject<Instance>(instanceData);
                }
                else
                {
                    throw new Exception("Unable to fetch instance");
                }

                return instance;
            }
        }
    }
}
