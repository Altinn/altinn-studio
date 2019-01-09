using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// The service builder API
    /// </summary>
    public class ServiceDevelopmentController : Controller
    {
        private readonly IRepository _repository;

        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceDevelopmentController"/> class
        /// </summary>
        /// <param name="repositoryService">The service repository service</param>
        public ServiceDevelopmentController(
            IRepository repositoryService)
        {
            _repository = repositoryService;
        }

        /// <summary>
        /// Default action for the designer
        /// </summary>
        /// <returns>default view for the service builder</returns>
        public IActionResult Index()
        {
            return View();
        }

        /// <summary>
        /// Gets the logic files for the service
        /// </summary>
        /// <param name="org">The organization identifier</param>
        /// <param name="service">The service identifier</param>
        /// <param name="fileType">The type of file (calculation | validation | dynamic)</param>
        /// <returns>The list of files</returns>
        public ActionResult GetLogicFiles(string org, string service, string fileType)
        {
            List<AltinnCoreFile> files = _repository.GetImplementationFiles(org, service);
            string fileList = string.Empty;
            foreach (AltinnCoreFile file in files)
            {
                fileList += file.FileName + ",";
            }

            fileList = fileList.Substring(0, fileList.Length - 1);

            return Content(fileList, "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get a specified logic file
        /// </summary>
        /// <param name="org">The organization identifier</param>
        /// <param name="service">The service identifier</param>
        /// <param name="fileName">The name of the file</param>
        /// <returns>The file contents</returns>
        public ActionResult GetLogicFile(string org, string service, string fileName)
        {
            string file = string.Empty;
            if (fileName == "RuleHandler.js")
            {
                file = _repository.GetResourceFile(org, service, fileName);
            }
            else
            {
                file = _repository.GetImplementationFile(org, service, fileName);
            }

            return Content(file, "text/plain", Encoding.UTF8);
        }
    }
}
