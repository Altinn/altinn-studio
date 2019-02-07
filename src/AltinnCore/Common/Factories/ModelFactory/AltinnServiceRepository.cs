using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Serialization;
using Manatee.Json;
using Manatee.Json.Schema;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

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
        ///  Reads all altinn services resources and returns a list of these
        /// </summary>
        /// <returns>the list</returns>
        public static async Task<List<AltinnResource>> ReadAllSchemaUrls()
        {
            List<AltinnResource> resources = await GetResourcesAsync();
            List<AltinnResource> result = new List<AltinnResource>();

            Dictionary<string, string> serviceCodeToServiceEditionCodeDictionary = new Dictionary<string, string>();

            foreach (AltinnResource resource in resources)
            {
                if (resource.ServiceOwnerCode.Equals("ACN") || resource.ServiceOwnerCode.Equals("ASF"))
                {
                    continue;
                }

                List<AltinnFormMetaData> forms = new List<AltinnFormMetaData>();                

                FormResource r = await GetFormsMetadata(resource);
                if (r != null && r.FormsMetaData != null && r.FormsMetaData.ToArray() != null)
                {
                    foreach (AltinnFormMetaData form in r.FormsMetaData)
                    {
                        form.XsdSchemaUrl = XsdUrl(resource, form);

                        form.JsonSchema = DownloadAndConvertXsdToJsonSchema(form.XsdSchemaUrl);

                        forms.Add(form);            
                    }                   
                }

                if (forms.Count > 0)
                {
                    resource.Forms = forms;
                    result.Add(resource);

                    RememberHighestServiceEditionCode(serviceCodeToServiceEditionCodeDictionary, resource);
                }
            }

            List<AltinnResource> filteredResult = new List<AltinnResource>();

            foreach (AltinnResource resource in result)
            {
                string highestEditionCode = serviceCodeToServiceEditionCodeDictionary.GetValueOrDefault(resource.ServiceCode);

                if (resource.ServiceEditionCode.Equals(highestEditionCode))
                {
                    filteredResult.Add(resource);
                }                    
            }

            return filteredResult;
        }

        private static JsonSchema DownloadAndConvertXsdToJsonSchema(string xsdSchemaUrl)
        {
            XmlReaderSettings settings = new XmlReaderSettings();
            settings.IgnoreWhitespace = true;

            XmlReader doc = XmlReader.Create(xsdSchemaUrl, settings);

            // XSD to Json Schema
            XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(doc, null);

            return xsdToJsonSchemaConverter.AsJsonSchema();
        }

        private static void RememberHighestServiceEditionCode(Dictionary<string, string> serviceCodeToServiceEditionCodeDictionary, AltinnResource resource)
        {
            string serviceCode = resource.ServiceCode;
            string lastHighestServiceEditionCode = serviceCodeToServiceEditionCodeDictionary.GetValueOrDefault(serviceCode);
            string currentServiceEditionCode = resource.ServiceEditionCode;

            if (string.IsNullOrEmpty(lastHighestServiceEditionCode))
            {
                serviceCodeToServiceEditionCodeDictionary.Add(serviceCode, resource.ServiceEditionCode);
            }
            else
            {
                int lastEditionCode = 0;
                int currentEditionCode = 0;

                int.TryParse(lastHighestServiceEditionCode, out lastEditionCode);
                int.TryParse(currentServiceEditionCode, out currentEditionCode);

                if (currentEditionCode > lastEditionCode)
                {
                    serviceCodeToServiceEditionCodeDictionary.Remove(serviceCode);
                    serviceCodeToServiceEditionCodeDictionary.Add(serviceCode, resource.ServiceEditionCode);
                }
            }
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

        public List<AltinnFormMetaData> Forms { get; set; }
    }

    public class FormResource
    {
        public string RestEnabled { get; set; }

        public List<AltinnFormMetaData> FormsMetaData { get; set; }
    }

    public class AltinnFormMetaData
    {
        public string FormID { get; set; }

        public string FormName { get; set; }

        public string FormType { get; set; }

        public string DataFormatID { get; set; }

        public string DataFormatVersion { get; set; }

        public string XsdSchemaUrl { get; set; }

        public JsonSchema JsonSchema { get; set; }
    }
}
