import { check, sleep } from "k6";
import {addErrorCount} from "../../../errorcounter.js";
import * as pdf from "../../../api/platform/pdf.js"

let pdfInputJson = open("../../../data/pdfInput.json");

export const options = {    
    thresholds:{
        "errors": ["rate<0.000001"]
    }
};

//Test for platform generate pdf and validate response
export default function() {    
    var res = pdf.generatePdf(pdfInputJson);   
    var success = check(res, {
      "Generate PDF Status is 200:": (r) => r.status === 200,
      "Generate PDF Content Type is application pdf:": (r) => r.headers["Content-Type"] === "application/pdf"
  });  
  addErrorCount(success);  
};