using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Runtime.Controllers
{
    public class CodelistController : Controller
    {
        private readonly IExecution _execution;

        public CodelistController(IExecution executionService)
        {
          _execution = executionService;
        }

        /// <summary>
        /// Returns 
        /// </summary>
        /// <param name="org"></param>
        /// <param name="service"></param>
        /// <param name="edition"></param>
        /// <param name="name"></param>
        /// <returns></returns>
        public IActionResult Index(string org, string service, string edition, string name)
        {
            string codelist = _execution.GetCodelist(org, service, edition, name);
            if (string.IsNullOrEmpty(codelist))
            {
              return Json("{}");
            }

            return Content(codelist);
        }
    }
}