using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml.Linq;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// This is the controller responsible for handling model functionality in AltinnCore
    /// </summary>
    public class ModelController : Controller
    {
        private readonly IRepository _repository;

        /// <summary>
        /// Initializes a new instance of the <see cref="ModelController"/> class
        /// </summary>
        /// <param name="repositoryService">The service Repository Service</param>
        public ModelController(IRepository repositoryService)
        {
            _repository = repositoryService;
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
        /// <param name="secondaryFiles">Secondary xsd</param>
        /// <returns>Return JSON of the generated model</returns>
        [HttpPost]
        public ActionResult Upload(string org, string service, IFormFile thefile, IEnumerable<IFormFile> secondaryFiles)
        {
            XDocument mainXsd = null;
            var secondaryXsds = new Dictionary<string, XDocument>();

            string mainFileName = ContentDispositionHeaderValue.Parse(new StringSegment(thefile.ContentDisposition)).FileName.ToString();
            using (var reader = new StreamReader(thefile.OpenReadStream()))
            {
                mainXsd = XDocument.Parse(reader.ReadToEnd());
            }

            secondaryXsds.Clear();

            foreach (IFormFile file in secondaryFiles)
            {
                string filename = ContentDispositionHeaderValue.Parse(new StringSegment(file.ContentDisposition)).FileName.ToString();
                using (var reader = new StreamReader(file.OpenReadStream()))
                {
                    secondaryXsds.Add(filename, XDocument.Parse(reader.ReadToEnd()));
                }
            }

            var seresParser = new SeresXsdParser(_repository);
            ServiceMetadata serviceMetadata = seresParser.ParseXsdToServiceMetadata(org, service, mainXsd, secondaryXsds);

            if (_repository.CreateModel(org, service, serviceMetadata, mainXsd))
            {
                return RedirectToAction("Index", new { org, service });
            }

            return Json(false);
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
            return Json(metadata, new JsonSerializerSettings() { Formatting = Formatting.Indented });
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
    }
}
