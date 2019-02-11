using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Serialization;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using JsonSerializer = Manatee.Json.Serialization.JsonSerializer;

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
        /// </summary>
        public AltinnServiceRepository()
        {
            Console.WriteLine("starting");            
        }

        /// <summary>
        ///  Gets all resources in altinn metadata
        /// </summary>
        /// <returns>list of the resources</returns>
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
        ///  Get forms metadata from altinn
        /// </summary>
        /// <param name="altinnResource">The resource</param>
        /// <returns>The form resource</returns>
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
        public static async Task<List<AltinnResource>> ReadAllSchemas()
        {
            List<AltinnResource> resources = await GetResourcesAsync();

            List<AltinnResource> result = new List<AltinnResource>();
            Dictionary<string, string> orgShortnameToOrgnumberMap = BuildOrganizationNumberMap();
            Dictionary<string, string> serviceCodeToServiceEditionCodeDictionary = new Dictionary<string, string>();

            string[] excludeServiceOwnerCodes = { "ACN", "ASF", "TTD" };

            foreach (AltinnResource resource in resources)
            {           
                if (excludeServiceOwnerCodes.Contains(resource.ServiceOwnerCode))
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

                        form.JsonSchema = Zip(DownloadAndConvertXsdToJsonSchema(form.XsdSchemaUrl));
                        forms.Add(form);
                    }
                }

                if (forms.Count > 0)
                {
                    string orgnr = orgShortnameToOrgnumberMap.GetValueOrDefault(resource.ServiceOwnerCode);

                    if (string.IsNullOrEmpty(orgnr))
                    {
                        Debug.WriteLine(resource.ServiceOwnerCode + "\t" + resource.ServiceOwnerName);
                    }

                    resource.OrganizationNumber = orgnr;
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

        private static string Zip(JsonSchema jsonSchema)
        {
            JsonSerializer serializer = new JsonSerializer();
            JsonValue json = serializer.Serialize(jsonSchema);

            byte[] bytes = Encoding.Unicode.GetBytes(json.GetIndentedString());
            using (MemoryStream msi = new MemoryStream(bytes))
            using (MemoryStream mso = new MemoryStream())
            {
                using (GZipStream gs = new GZipStream(mso, CompressionMode.Compress))
                {
                    msi.CopyTo(gs);
                }

                return Convert.ToBase64String(mso.ToArray());
            }
        }

        private static Dictionary<string, string> BuildOrganizationNumberMap()
        {
            Dictionary<string, string> orgShortnameToOrgnumberMap = new Dictionary<string, string>();

            using (StreamReader r = new StreamReader("Schemas/orgs.json"))
            {
                string json = r.ReadToEnd();
                List<Organization> orgs = JsonConvert.DeserializeObject<List<Organization>>(json);
                foreach (Organization org in orgs)
                {
                    orgShortnameToOrgnumberMap.Add(org.Shortname, org.Orgnr);
                }
            }

            return orgShortnameToOrgnumberMap;
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

        public string OrganizationNumber { get; set; }

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

        public string JsonSchema { get; set; }
    }

    public class Organization
    {
        public string Name { get; set; }

        public string Shortname { get; set; }

        public string Orgnr { get; set; }

        public string Url { get; set; }
    }
}
