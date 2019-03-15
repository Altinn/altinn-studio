using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
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
                string apiUrl = string.Format("http://localhost:5010/api/v1/instances/?applicationId={0}&instanceOwnerId={1}", applicationId, instanceOwnerId);
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
                    string id = await response.Content.ReadAsStringAsync();
                    instanceId = Guid.Parse(id);
                    return instanceId;
                }
                catch
                {
                    return Guid.Parse(string.Empty);
                }                
            }
        }

        //public object GetInstance(Guid instanceId)
        //{
            
        //}
    }
}
