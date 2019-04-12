using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Manatee.Json;
using Manatee.Json.Schema;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// This is the controller responsible for handling model functionality in AltinnCore
    /// </summary>
    [Authorize]
    public class ModelController : Controller
    {
        private readonly IRepository _repository;
        private readonly ILoggerFactory _loggerFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="ModelController"/> class
        /// </summary>
        /// <param name="repositoryService">The service Repository Service</param>
        /// <param name="loggerFactory"> the logger factory</param>
        public ModelController(IRepository repositoryService, ILoggerFactory loggerFactory)
        {
            _repository = repositoryService;
            _loggerFactory = loggerFactory;
        }

        /// <summary>
        /// The default action presenting the
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The model main page</returns>
        public ActionResult Index(string org, string service)
        {
            ServiceMetadata metadata = _repository.GetServiceMetaData(org, service);
            return View(metadata);
        }

        /// <summary>
        /// Post action that is used when uploading a XSD and secondary XSD
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="thefile">The main XSD</param>
        /// <returns>Return JSON of the generated model</returns>
        [HttpPost]
        public ActionResult Upload(string org, string service, IFormFile thefile)
        {
            if (thefile == null)
            {
                throw new ApplicationException("Cannot upload empty file");
            }

            string mainFileName = ContentDispositionHeaderValue.Parse(new StringSegment(thefile.ContentDisposition)).FileName.ToString();

            MemoryStream xsdMemoryStream = new MemoryStream();
            thefile.OpenReadStream().CopyTo(xsdMemoryStream);
            xsdMemoryStream.Position = 0;
            XmlReader reader = XmlReader.Create(xsdMemoryStream, new XmlReaderSettings { IgnoreWhitespace = true });

            XDocument mainXsd = XDocument.Load(reader, LoadOptions.None);

            ServiceMetadata serviceMetadata = null;

            bool useOldParser = false;
            if (useOldParser)
            {
                var seresParser = new SeresXsdParser(_repository);
                serviceMetadata = seresParser.ParseXsdToServiceMetadata(org, service, mainXsd, null);
            }
            else
            {
                xsdMemoryStream.Position = 0;
                reader = XmlReader.Create(xsdMemoryStream, new XmlReaderSettings { IgnoreWhitespace = true });

                XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(reader, _loggerFactory.CreateLogger<XsdToJsonSchema>());
                JsonSchema schemaJsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

                JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(org, service, schemaJsonSchema);
                serviceMetadata = converter.GetServiceMetadata();

                HandleTexts(org, service, converter.GetTexts());
            }

            if (_repository.CreateModel(org, service, serviceMetadata, mainXsd))
            {
                return RedirectToAction("Index", new { org, service });
            }

            return Json(false);
        }

        private void HandleTexts(string org, string service, Dictionary<string, Dictionary<string, string>> allTexts)
        {
            Dictionary<string, Dictionary<string, string>> existingTexts = _repository.GetServiceTexts(org, service);

            if (existingTexts == null)
            {
                existingTexts = new Dictionary<string, Dictionary<string, string>>();
            }           

            foreach (KeyValuePair<string, Dictionary<string, string>> cultureString in allTexts)
            {
                if (!existingTexts.ContainsKey(cultureString.Key))
                {
                    existingTexts.Add(cultureString.Key, new Dictionary<string, string>());
                }

                foreach (KeyValuePair<string, string> localizedString in cultureString.Value)
                {
                    if (!existingTexts[cultureString.Key].ContainsKey(localizedString.Key))
                    {
                        existingTexts[cultureString.Key].Add(localizedString.Key, localizedString.Value);
                    }
                }
            }

            _repository.SaveServiceTexts(org, service, existingTexts);
        }

        /// <summary>
        /// Return JSON presentation of the model
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="texts">Boolean indicating if text should be included</param>
        /// <param name="restrictions">Boolean indicating if restrictions should be included</param>
        /// <param name="attributes">Boolean indicating if attributes should be included</param>
        /// <returns>The model as JSON</returns>
        [HttpGet]
        public ActionResult GetJson(string org, string service, bool texts = true, bool restrictions = true, bool attributes = true)
        {
            ServiceMetadata metadata = _repository.GetServiceMetaData(org, service);
            return Json(metadata, new JsonSerializerSettings() { Formatting = Newtonsoft.Json.Formatting.Indented });
        }

        /// <summary>
        /// Updates the service metadata and regenerates the service model
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="serviceMetadata">The new service metadata</param>
        /// <returns>Was the request a success</returns>
        [HttpPost]
        public ActionResult UpdateServiceMetadata(string org, string service, string serviceMetadata)
        {
            ServiceMetadata serviceMetadataObject = JsonConvert.DeserializeObject<ServiceMetadata>(serviceMetadata);

            if (!ModelState.IsValid)
            {
                return BadRequest("Modelstate is invalid");
            }

            if (_repository.UpdateServiceMetadata(org, service, serviceMetadataObject))
            {
                _repository.CreateModel(org, service, serviceMetadataObject, null);
                return Ok("Metadata was saved and model re-generated");
            }
            else
            {
                return BadRequest("Failed to update service metadata");
            }
        }

        /// <summary>
        /// Returns the model as C# code
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The model as C#</returns>
        [HttpGet]
        public ActionResult GetModel(string org, string service)
        {
            return Content(_repository.GetServiceModel(org, service), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get the model as XSD
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The model representation as XSD</returns>
        [HttpGet]
        public ActionResult GetXsd(string org, string service)
        {
            return Content(_repository.GetXsdModel(org, service), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get the model as Json Schema
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The model representation as Json Schema</returns>
        [HttpGet]
        public ActionResult GetJsonSchema(string org, string service)
        {
            return Content(_repository.GetJsonSchemaModel(org, service), "text/plain", Encoding.UTF8);
        }
    }
}
