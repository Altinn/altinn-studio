using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Manatee.Json;

namespace AltinnCore.Common.Factories.ModelFactory
{
    /// <summary>
    ///  Rest client that asks altinn for the xsds in production
    /// </summary>
    public class AltinnServiceRepository
    {
        private static HttpClient client = new HttpClient();

        /// <summary>
        /// Initializes a new instance of the <see cref="AltinnServiceRepository"/> class.
        ///   xyz
        /// </summary>
        public AltinnServiceRepository()
        {
            Console.WriteLine("starting");
        }

        /// <summary>
        ///  132345
        /// </summary>
        /// <returns>jijiji</returns>
        public static async Task<List<AltinnResource>> GetResourcesAsync()
        {
            List<AltinnResource> resources = null;

            string path = "https://www.altinn.no/api/metadata";

            HttpResponseMessage response = await client.GetAsync(path);
            if (response.IsSuccessStatusCode)
            {
                resources = await response.Content.ReadAsAsync<List<AltinnResource>>();    
            }

            return resources;
        }

        /// <summary>
        ///  djkfkfa
        /// </summary>
        /// <param name="altinnResource">afassdf</param>
        /// <returns>ddfdf</returns>
        public static async Task<FormResource> GetFormsMetadata(AltinnResource altinnResource)
        {
            string path = FormTaskUrl(altinnResource);
            FormResource result = null;

            HttpResponseMessage response = await client.GetAsync(path);
            if (response.IsSuccessStatusCode)
            {
                result = await response.Content.ReadAsAsync<FormResource>();
            }

            return result;
        }

        private static string FormTaskUrl(AltinnResource altinnResource)
        {
            return "https://www.altinn.no/api/metadata/formtask/" + altinnResource.ServiceCode + "/" + altinnResource.ServiceEditionCode;
        }

        private static string XsdUrl(AltinnResource altinnResource, AltinnFormMetaData formMetaData)
        {
            return FormTaskUrl(altinnResource) + "/forms/" + formMetaData.DataFormatID + "/" + formMetaData.DataFormatVersion + "/xsd";
        }

        /// <summary>
        ///  idjfidfj
        /// </summary>
        /// <returns>sldøfi</returns>
        public static async Task<JsonArray> ReadAllSchemaUrls()
        {
            List<AltinnResource> resources = await GetResourcesAsync();
            var result = new JsonArray();

            foreach (AltinnResource resource in resources)
            {            
                JsonObject service = new JsonObject
                {
                    { "ownerCode", resource.ServiceOwnerCode },
                    { "ownerName", resource.ServiceOwnerName },
                    { "code", resource.ServiceCode },
                    { "name", resource.ServiceName },
                    { "edition", resource.ServiceEditionCode },
                    { "type", resource.ServiceType },
                    { "validFrom", resource.ValidFrom.ToString() },
                    { "validTo", resource.ValidTo.ToString() },
                };

                JsonArray forms = new JsonArray();
                service.Add("forms", forms);

                FormResource r = await GetFormsMetadata(resource);
                if (r != null && r.FormsMetaData != null && r.FormsMetaData.ToArray() != null)
                {
                    foreach (AltinnFormMetaData form in r.FormsMetaData)
                    {
                        var serviceXsdSchemaUrl = XsdUrl(resource, form);

                        JsonObject jsonForm = new JsonObject();
                        jsonForm.Add("DataFormatID", form.DataFormatID);
                        jsonForm.Add("DataFormatVersion", form.DataFormatVersion);
                        jsonForm.Add("schemaUrl", serviceXsdSchemaUrl);
                        forms.Add(jsonForm);            
                    }                   
                }

                result.Add(service);
            }

            return result;
        }
    }

#pragma warning disable SA1600 // Elements should be documented
    public class AltinnResource
    {
        public string ServiceOwnerCode { get; set; }

        public string ServiceOwnerName { get; set; }

        public string ServiceName { get; set; }

        public string ServiceCode { get; set; }

        public string ServiceEditionCode { get; set; }

        public DateTime ValidFrom { get; set; }

        public DateTime ValidTo { get; set; }

        public string ServiceType { get; set; }

        public string EnterpriseUserEnabled { get; set; }
    }

    public class FormResource
    {
        public string RestEnabled { get; set; }

        public List<AltinnFormMetaData> FormsMetaData { get; set; }
    }

    public class AltinnFormMetaData
    {
        public string FormID { get; set; }

        public string DataFormatID { get; set; }

        public string DataFormatVersion { get; set; }
    }
}
