import { useState, useCallback } from "react";
import { getCookieValue } from "../api";

interface FetchState<T> {
  data: T;
  pending: boolean;
  error?: string;
}



export default function usePost<T>(
  url: string | undefined,
) {
  // Use only one state, to ensure updates are atomic
  const [state, setState] = useState<FetchState<T>[]>([]);

  const doPost = useCallback( async (data:T)=>{
    let stateIndex: Number | undefined;
    setState((prevState)=>{
      stateIndex = prevState.length+1;
      return [...prevState, {data, pending:true,}]
    })
    const resp = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),

      headers: { 
        "Content-Type": "application/json; charset=UTF-8",
        "X-XSRF-TOKEN": getCookieValue("XSRF-TOKEN") 
      }
    })
    const text = await resp.text();
    if(resp.status === 200){
      setState((prevState)=>prevState.map((s, i)=>(i===stateIndex?{...s,pending:false}:s)))
    }else{
      setState((prevState)=>prevState.map((s, i)=>(i===stateIndex?{...s,pending:false, error:text}:s)))
    }
  },[url])
  

  return {
    doPost,
    pending: state[state.length-1]?.pending ?? false,
    error: state[state.length-1]?.error ?? undefined,
    data: state,
  };
}
