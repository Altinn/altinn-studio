using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// code list actions
    /// </summary>
    public class CodelistController : Controller
    {
        private readonly IExecution _execution;

        /// <summary>
        /// Initializes a new instance of the <see cref="CodelistController"/> class
        /// </summary>
        /// <param name="executionService">the execution service handler</param>
        public CodelistController(IExecution executionService)
        {
          _execution = executionService;
        }

        /// <summary>
        /// Returns
        /// </summary>
        /// <param name="org">the organisation</param>
        /// <param name="service">the service</param>
        /// <param name="name">name</param>
        /// <returns>The codelist</returns>
        public IActionResult Index(string org, string service, string name)
        {
            string codelist = _execution.GetCodelist(org, service, name);
            if (string.IsNullOrEmpty(codelist))
            {
              return Json("{}");
            }

            return Content(codelist);
        }
    }
}
