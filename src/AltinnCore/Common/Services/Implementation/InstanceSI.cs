using System;
using System.IO;
using System.Net.Http;
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
        public object SaveInstance<T>(T dataToSerialize)
        {
            using (HttpClient client = new HttpClient())
            {
                string apiUrl = "http://localhost:5010/api/v1/instances";
                client.BaseAddress = new Uri(apiUrl);
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                try
                {
                    MemoryStream formDataStream = new MemoryStream();

                    var jsonData = JsonConvert.SerializeObject(dataToSerialize);
                    StreamWriter writer = new StreamWriter(formDataStream);
                    writer.Write(jsonData);
                    writer.Flush();
                    formDataStream.Position = 0;
                    Task<HttpResponseMessage> response = client.PostAsync(apiUrl, new StreamContent(formDataStream));
                }
                catch
                {
                    return string.Empty;
                }

                return string.Empty;
            }
        }

        //public object GetInstance(Guid instanceId)
        //{
            
        //}
    }
}
