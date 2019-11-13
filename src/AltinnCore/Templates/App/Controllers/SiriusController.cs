using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Services.Interfaces;
using Altinn.App.Services.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace App.Controllers
{
    [Route("{org}/{app}/sirius/")]
    [ApiController]
    public class SiriusController : ControllerBase
    {
        private readonly IReiseApi reiseService;

        public SiriusController(IReiseApi reiseService)
        {
            this.reiseService = reiseService;
        }


        [HttpGet]
        public async Task<ActionResult> Get(string orgno, string data)
        {
            List<Stop> stops = reiseService.GetRuterStops();
            return Ok(stops);
        }
    }
}
