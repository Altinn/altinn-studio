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
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model main page</returns>
        public ActionResult Index(string org, string app)
        {
            ServiceMetadata metadata = _repository.GetServiceMetaData(org, app);
            return View(metadata);
        }

        /// <summary>
        /// Post action that is used when uploading a XSD and secondary XSD
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="thefile">The main XSD</param>
        /// <returns>Return JSON of the generated model</returns>
        [HttpPost]
        public ActionResult Upload(string org, string app, IFormFile thefile)
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

            xsdMemoryStream.Position = 0;
            reader = XmlReader.Create(xsdMemoryStream, new XmlReaderSettings { IgnoreWhitespace = true });

            XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(reader, _loggerFactory.CreateLogger<XsdToJsonSchema>());
            JsonSchema schemaJsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(org, app, schemaJsonSchema);
            serviceMetadata = converter.GetServiceMetadata();

            HandleTexts(org, app, converter.GetTexts());

            if (_repository.CreateModel(org, app, serviceMetadata, mainXsd))
            {
                return RedirectToAction("Index", new { org, app });
            }

            return Json(false);
        }

        private void HandleTexts(string org, string app, Dictionary<string, Dictionary<string, string>> allTexts)
        {
            Dictionary<string, Dictionary<string, string>> existingTexts = _repository.GetServiceTexts(org, app);

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

            _repository.SaveServiceTexts(org, app, existingTexts);
        }

        /// <summary>
        /// Return JSON presentation of the model
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="texts">Boolean indicating if text should be included</param>
        /// <param name="restrictions">Boolean indicating if restrictions should be included</param>
        /// <param name="attributes">Boolean indicating if attributes should be included</param>
        /// <returns>The model as JSON</returns>
        [HttpGet]
        public ActionResult GetJson(string org, string app, bool texts = true, bool restrictions = true, bool attributes = true)
        {
            ServiceMetadata metadata = _repository.GetServiceMetaData(org, app);
            return Json(metadata, new JsonSerializerSettings() { Formatting = Newtonsoft.Json.Formatting.Indented });
        }

        /// <summary>
        /// Updates the service metadata and regenerates the service model
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceMetadata">The new service metadata</param>
        /// <returns>Was the request a success</returns>
        [HttpPost]
        public ActionResult UpdateServiceMetadata(string org, string app, string serviceMetadata)
        {
            ServiceMetadata serviceMetadataObject = JsonConvert.DeserializeObject<ServiceMetadata>(serviceMetadata);

            if (!ModelState.IsValid)
            {
                return BadRequest("Modelstate is invalid");
            }

            if (_repository.UpdateServiceMetadata(org, app, serviceMetadataObject))
            {
                _repository.CreateModel(org, app, serviceMetadataObject, null);
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
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model as C#</returns>
        [HttpGet]
        public ActionResult GetModel(string org, string app)
        {
            return Content(_repository.GetServiceModel(org, app), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get the model as XSD
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model representation as XSD</returns>
        [HttpGet]
        public ActionResult GetXsd(string org, string app)
        {
            return Content(_repository.GetXsdModel(org, app), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get the model as Json Schema
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model representation as Json Schema</returns>
        [HttpGet]
        public ActionResult GetJsonSchema(string org, string app)
        {
            return Content(_repository.GetJsonSchemaModel(org, app), "text/plain", Encoding.UTF8);
        }
    }
}
