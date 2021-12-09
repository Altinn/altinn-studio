import * as React from 'react';
import { IInputProps, InputComponent } from '../base/InputComponent';

interface LookupSource{
  url: string,
  regex: RegExp,
}

// Utility function to get correct type on lookupSources
function _typeLookupSource<T extends {[name:string]: LookupSource}>(s:T): T{
  return s;
}

const lookupSources = _typeLookupSource({
  "orgnr": {
    url: "https://data.brreg.no/enhetsregisteret/api/enheter/{value}",
    regex: /[0-9]{9}/,
  },
  "postnummer":{
    url: "https://api.bring.com/shippingguide/api/postalCode.json",
    regex: /[0-9]{4}/,
  }
});

interface IInputLookupProps extends IInputProps {
  lookupSrc: keyof typeof lookupSources
}


export function InputLookupComponent(props: IInputLookupProps){
  const {
    lookupSrc,
    formData,
    handleDataChange,
    ...inputProps
  } = props;

  const simpleBinding = formData.simpleBinding;
  const simpleBindingRef = React.useRef(null);
  simpleBindingRef.current = simpleBinding;
  const lookupResultRef = React.useRef(null);
  lookupResultRef.current = formData.lookupResult;
  const prevLookup = React.useRef(null);

  React.useEffect(()=>{
    const src = lookupSources[lookupSrc];
    if(src.regex.test(simpleBinding) && prevLookup.current !== simpleBinding){
      prevLookup.current = simpleBinding;
      const ac = new AbortController();
      let done = false;
      fetch(src.url.replace("{value}", simpleBinding), { signal: ac.signal})
      .then(resp=>resp.json())
      .then(result=>{
        done = true;
        // Only update lookupResult if value has not changed
        if(simpleBinding === simpleBindingRef.current && lookupResultRef.current !== result.navn){
          handleDataChange(result.navn, "lookupResult" )
        }
      })
      .catch(e=>{
        if(e.name !== "AbortError" && simpleBinding === simpleBindingRef.current){
          // value has not changed, and this is a real server error
          // inform the user by setting the lookup result to 
          done = true;
          handleDataChange( "error", "lookupResult")
        }
      })
      // cleanup when effect dependencies change (or component is unmounted)
      return ()=>{
        // Ensure that pending calls are aborted
        if(!done) ac.abort();
      }
    }
    else
    if( !src.regex.test(simpleBinding) && lookupResultRef.current && lookupResultRef.current !== "error"){
      handleDataChange("", "lookupResult");
    }
  },[lookupSrc, simpleBinding, handleDataChange])

  return <InputComponent {...inputProps} formData={simpleBinding} handleDataChange={handleDataChange} />
}