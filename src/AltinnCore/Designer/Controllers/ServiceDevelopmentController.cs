using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Enums;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// The service builder API
    /// </summary>
    [Authorize]
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
        /// Gets all service files for specified mode
        /// </summary>
        /// <param name="org">The organization identifier</param>
        /// <param name="service">The service identifier</param>
        /// <param name="fileEditorMode">The mode for which files should be fetched</param>
        /// <returns>A comma-separated list of all the files</returns>
        public ActionResult GetServiceFiles(string org, string service, FileEditorMode fileEditorMode)
        {
            switch (fileEditorMode)
            {
                case FileEditorMode.Implementation:
                    return GetImplementationFiles(org, service);
                case FileEditorMode.Dynamics:
                    return GetResourceFiles(org, service, true);
                default:
                    return Content(string.Empty);
            }
        }

        /// <summary>
        /// Gets the content of a specified file for the service
        /// </summary>
        /// <param name="org">The organization identifier</param>
        /// <param name="service">The service identifier</param>
        /// <param name="fileEditorMode">The mode for which files should be fetched</param>
        /// <param name="fileName">The name of the file to fetch</param>
        /// <returns>The content of the file</returns>
        public ActionResult GetServiceFile(string org, string service, FileEditorMode fileEditorMode, string fileName)
        {
            string file = string.Empty;
            switch (fileEditorMode)
            {
                case FileEditorMode.Implementation:
                    file = _repository.GetImplementationFile(org, service, fileName);
                    break;
                case FileEditorMode.Dynamics:
                    file = _repository.GetResourceFile(org, service, "Dynamics/" + fileName);
                    break;
                case FileEditorMode.All:
                    file = _repository.GetConfiguration(org, service, fileName);
                    break;
                default:
                    break;
            }

            return Content(file, "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Gets the content of a specified file for the service
        /// </summary>
        /// <param name="org">The organization identifier</param>
        /// <param name="service">The service identifier</param>
        /// <param name="fileEditorMode">The mode for which files should be saved</param>
        /// <param name="fileName">The name of the file to save</param>
        /// <returns>The content of the file</returns>
        [HttpPost]
        public IActionResult SaveServiceFile(string org, string service, FileEditorMode fileEditorMode, string fileName)
        {
            string content = string.Empty;
            using (var reader = new StreamReader(Request.Body))
            {
                content = reader.ReadToEnd();
            }

            switch (fileEditorMode)
            {
                case FileEditorMode.Implementation:
                    if (fileName == "RuleHandler.js")
                    {
                        _repository.SaveResourceFile(org, service, fileName, content);
                    }
                    else
                    {
                        _repository.SaveImplementationFile(org, service, fileName, content);
                    }

                    break;
                case FileEditorMode.Dynamics:
                    _repository.SaveResourceFile(org, service, "Dynamics/" + fileName, content);
                    break;
                case FileEditorMode.All:
                    _repository.SaveConfiguration(org, service, fileName, content);
                    break;
                default:
                    // Return 501 Not Implemented
                    return StatusCode(501);
            }

            return StatusCode(200);
        }

        private ActionResult GetImplementationFiles(string org, string service)
        {
            List<AltinnCoreFile> files = _repository.GetImplementationFiles(org, service);
            return Content(GetCommaSeparatedFileList(files), "text/plain", Encoding.UTF8);
        }

        private ActionResult GetResourceFiles(string org, string service, bool dynamics)
        {
            List<AltinnCoreFile> files = null;

            if (dynamics)
            {
                files = _repository.GetDynamicsFiles(org, service);
            }
            else
            {
                throw new NotImplementedException();
            }

            return Content(GetCommaSeparatedFileList(files), "text/plain", Encoding.UTF8);
        }

        private string GetCommaSeparatedFileList(List<AltinnCoreFile> files)
        {
            string fileList = string.Empty;
            foreach (AltinnCoreFile file in files)
            {
                fileList += file.FileName + ",";
            }

            return fileList.Substring(0, fileList.Length - 1);
        }
    }
}
