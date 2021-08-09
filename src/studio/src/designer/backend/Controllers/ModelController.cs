using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Manatee.Json.Schema;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// This is the controller responsible for handling model functionality in AltinnCore
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    public class ModelController : Controller
    {
        private readonly IRepository _repository;
        private readonly ILoggerFactory _loggerFactory;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ModelController"/> class
        /// </summary>
        /// <param name="repositoryService">The service Repository Service</param>
        /// <param name="loggerFactory"> the logger factory</param>
        /// <param name="logger">the logger.</param>
        public ModelController(IRepository repositoryService, ILoggerFactory loggerFactory, ILogger<ModelController> logger)
        {
            _repository = repositoryService;
            _loggerFactory = loggerFactory;
            _logger = logger;
        }

        /// <summary>
        /// The default action presenting the application model.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model main page</returns>
        public ActionResult Index(string org, string app)
        {
            ModelMetadata metadata = _repository.GetModelMetadata(org, app);
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

            xsdMemoryStream.Position = 0;
            reader = XmlReader.Create(xsdMemoryStream, new XmlReaderSettings { IgnoreWhitespace = true });

            XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(reader, _loggerFactory.CreateLogger<XsdToJsonSchema>());
            JsonSchema schemaJsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(org, app, schemaJsonSchema);
            ModelMetadata modelMetadata = converter.GetModelMetadata();

            HandleTexts(org, app, converter.GetTexts());

            string modelName = Path.GetFileNameWithoutExtension(mainFileName);

            if (_repository.CreateModel(org, app, modelMetadata, mainXsd, modelName))
            {
                return RedirectToAction("Index", new { org, app, modelName });
            }

            return Json(false);
        }

        private void HandleTexts(string org, string app, Dictionary<string, Dictionary<string, TextResourceElement>> modelTexts)
        {
            // <textResourceElement.Id <language, textResourceElement>>
            Dictionary<string, Dictionary<string, TextResourceElement>> existingTexts = _repository.GetServiceTexts(org, app);

            if (existingTexts == null)
            {
                existingTexts = new Dictionary<string, Dictionary<string, TextResourceElement>>();
            }

            foreach (KeyValuePair<string, Dictionary<string, TextResourceElement>> textResourceElementDict in modelTexts)
            {
                string textResourceElementId = textResourceElementDict.Key;

                if (!existingTexts.ContainsKey(textResourceElementId))
                {
                    existingTexts.Add(textResourceElementId, new Dictionary<string, TextResourceElement>());
                }

                foreach (KeyValuePair<string, TextResourceElement> localizedString in textResourceElementDict.Value)
                {
                    string language = localizedString.Key;
                    TextResourceElement textResourceElement = localizedString.Value;
                    if (!existingTexts[textResourceElementId].ContainsKey(language))
                    {
                        existingTexts[textResourceElementId].Add(language, textResourceElement);
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
            ModelMetadata metadata = _repository.GetModelMetadata(org, app);
            return Json(metadata, new JsonSerializerSettings() { Formatting = Newtonsoft.Json.Formatting.Indented });
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
            return Content(_repository.GetAppModel(org, app), "text/plain", Encoding.UTF8);
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
