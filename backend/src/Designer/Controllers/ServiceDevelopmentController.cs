using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// The app builder API.
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/service-development")]
    [Obsolete("ServiceDevelopmentController is deprecated, please use a combination of Text-, FormEditor- and ModelController instead.")]
    public class ServiceDevelopmentController : Controller
    {
        private readonly IRepository _repository;
        private readonly ISourceControl _sourceControl;

        /// <summary>
        /// Initializes a new instance of the <see cref="ServiceDevelopmentController"/> class.
        /// </summary>
        /// <param name="repositoryService">The service repository service.</param>
        /// <param name="sourceControl">The source control service.</param>
        public ServiceDevelopmentController(
            IRepository repositoryService, ISourceControl sourceControl)
        {
            _repository = repositoryService;
            _sourceControl = sourceControl;
        }

        /// <summary>
        /// Gets all app files for specified mode.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileEditorMode">The mode for which files should be fetched.</param>
        /// <returns>A comma-separated list of all the files.</returns>
        [HttpGet]
        [Route("get-all")]
        [Obsolete("GetServiceFiles is deprecated")]
        public IActionResult GetServiceFiles(string org, string app, FileEditorMode fileEditorMode)
        {
            switch (fileEditorMode)
            {
                case FileEditorMode.Implementation:
                    return GetImplementationFiles(org, app);
                case FileEditorMode.Calculation:
                    return GetCalculationFiles(org, app);
                case FileEditorMode.Dynamics:
                    return GetResourceFiles(org, app, true);
                case FileEditorMode.Validation:
                    return GetValidationFiles(org, app);
                default:
                    return Content(string.Empty);
            }
        }

        /// <summary>
        /// Gets the content of a specified file for the app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileEditorMode">The mode for which files should be fetched.</param>
        /// <param name="fileName">The name of the file to fetch.</param>
        /// <returns>The content of the file.</returns>
        [HttpGet]
        [Route("get")]
        [Obsolete("GetServiceFile is deprecated, use FormEditorController methods to get rulehandler and ModelController to get configuration/model-metadata instead. The other retrieved files are irrelevant.")]
        public IActionResult GetServiceFile(string org, string app, FileEditorMode fileEditorMode, string fileName)
        {
            if (!ApplicationHelper.IsValidFilename(fileName))
            {
                return BadRequest();
            }

            string file = string.Empty;
            switch (fileEditorMode)
            {
                case FileEditorMode.Implementation:
                    file = _repository.GetAppLogic(org, app, fileName);
                    break;
                case FileEditorMode.Calculation:
                    file = _repository.GetAppLogic(org, app, "Calculation/" + fileName);
                    break;
                case FileEditorMode.Validation:
                    file = _repository.GetAppLogic(org, app, "Validation/" + fileName);
                    break;
                case FileEditorMode.Dynamics:
                    file = _repository.GetRuleHandler(org, app);
                    break;
                case FileEditorMode.All:
                    file = _repository.GetConfiguration(org, app, fileName);
                    break;
                case FileEditorMode.Root:
                    file = _repository.GetFileByRelativePath(org, app, fileName);
                    break;
            }

            return Content(file, "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Gets the content of a specified file for the app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileEditorMode">The mode for which files should be saved.</param>
        /// <param name="fileName">The name of the file to save.</param>
        /// <param name="stageFile">true if the file needs to be staged</param>
        /// <returns>The content of the file.</returns>
        [HttpPost]
        [Route("save")]
        [Obsolete("SaveServiceFile is deprecated, use FormEditorController methods to set rulehandler and ModelController to set configuration/model-metadata instead. The other saved files are irrelevant.")]
        public IActionResult SaveServiceFile(string org, string app, FileEditorMode fileEditorMode, string fileName, bool stageFile)
        {
            if (!ApplicationHelper.IsValidFilename(fileName))
            {
                return BadRequest();
            }

            string content = string.Empty;

            try
            {
                using (var reader = new StreamReader(Request.Body))
                {
                    content = reader.ReadToEnd();
                }

                switch (fileEditorMode)
                {
                    case FileEditorMode.Implementation:
                        _repository.SaveAppLogicFile(org, app, fileName, content);
                        break;
                    case FileEditorMode.Dynamics:
                        _repository.SaveRuleHandler(org, app, content);
                        break;
                    case FileEditorMode.Calculation:
                        _repository.SaveAppLogicFile(org, app, "Calculation/" + fileName, content);
                        break;
                    case FileEditorMode.Validation:
                        _repository.SaveAppLogicFile(org, app, "Validation/" + fileName, content);
                        break;
                    case FileEditorMode.All:
                        _repository.SaveConfiguration(org, app, fileName, content);
                        break;
                    case FileEditorMode.Root:
                        _repository.SaveFile(org, app, fileName, content);
                        break;
                    default:
                        // Return 501 Not Implemented
                        return new ObjectResult(new { HttpStatusCode.NotImplemented });
                }

                if (stageFile)
                {
                    _sourceControl.StageChange(org, app, fileName);
                }

                return NoContent();
            }
            catch (Exception)
            {
                return new ObjectResult(new { HttpStatusCode.InternalServerError });
            }
        }

        private IActionResult GetImplementationFiles(string org, string app)
        {
            List<AltinnCoreFile> files = _repository.GetImplementationFiles(org, app);

            return Content(GetCommaSeparatedFileList(files), "text/plain", Encoding.UTF8);
        }

        private IActionResult GetCalculationFiles(string org, string app)
        {
            List<AltinnCoreFile> files = _repository.GetCalculationFiles(org, app);

            return Content(GetCommaSeparatedFileList(files), "text/plain", Encoding.UTF8);
        }

        private IActionResult GetValidationFiles(string org, string app)
        {
            List<AltinnCoreFile> files = _repository.GetValidationFiles(org, app);

            return Content(GetCommaSeparatedFileList(files), "text/plain", Encoding.UTF8);
        }

        private IActionResult GetResourceFiles(string org, string app, bool dynamics)
        {
            List<AltinnCoreFile> files;

            if (dynamics)
            {
                files = _repository.GetDynamicsFiles(org, app);
            }
            else
            {
                throw new NotImplementedException();
            }

            return Content(GetCommaSeparatedFileList(files), "text/plain", Encoding.UTF8);
        }

        private static string GetCommaSeparatedFileList(List<AltinnCoreFile> files)
        {
            var fileList = new StringBuilder();
            foreach (AltinnCoreFile file in files)
            {
                fileList.Append(file.FileName + ",");
            }

            return fileList.ToString().Substring(0, fileList.Length - 1);
        }
    }
}
