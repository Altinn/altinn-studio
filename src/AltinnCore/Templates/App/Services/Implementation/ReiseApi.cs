using Altinn.App.Services.Interfaces;
using Altinn.App.Services.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace Altinn.App.Services.Implementation
{
    public class ReiseApi : IReiseApi
    {
        public List<Stop> GetRuterStops()
        {
            HttpClient client = new HttpClient();
            HttpResponseMessage response = client.GetAsync("https://reisapi.ruter.no/Place/GetStopsRuter").Result;
            string stopsData = response.Content.ReadAsStringAsync().Result;
            List<Stop> stops = JsonConvert.DeserializeObject<List<Stop>>(stopsData);
            return stops;
        }
    }
}
