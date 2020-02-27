import http from "k6/http";
import * as config from "../../config.js";

//Request to generate pdf from a json and returns the response
export function generatePdf(pdfInputJson){    
    var endpoint = config.platformPdf["generate"];   
    var params = {
        headers: {            
            "Content-Type": "application/json"        
        }
    };   
    return http.post(endpoint, pdfInputJson, params);
};