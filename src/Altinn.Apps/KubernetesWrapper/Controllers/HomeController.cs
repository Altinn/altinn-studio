using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers
{
    [Route("/")]
    public class HomeController : ControllerBase
    {

        [HttpGet]
        public string Get()
        {
            return "hello v3";
        }
    }
}
