import {useState, useMemo, useCallback} from "react"

import { collator } from '../components/Editor';

/**
 * Utility hook for editing an array of objects
 * 
 * Assumptions
 * =========== 
 * * each object has an unique ID property
 * * The update cell is to be used with an input element
 * <input onChange={updateCell} lang={language} data-id={rowId}/>
 * 
 * 
 * @param storedValues The original array of objects before editing
 * @returns 
 */
export default function useEditArray<T extends Record<string,string>>(storedValues:Record<string,T>){
  const [edits, setRawEdits] = useState<Record<string, T>>({})
  const [newIds, setNewIds] = useState<string[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const allIds = useMemo(()=>
    Object.keys(storedValues).concat(newIds).filter(id=>deletedIds.indexOf(id) === -1).sort(collator.compare)
  , [storedValues, newIds, deletedIds])
  const data = useMemo(()=>
    allIds.map(id=>(
      {
        id,
        orig: storedValues[id],
        edit: edits[id]
      }
      ))
  , [storedValues, newIds, edits])

  // console.log(edits, newIds, deletedIds)
  const updateCell = useCallback((e: React.ChangeEvent<HTMLInputElement>)=>{
    const value = e.target.value;
    const id = e.target.dataset.id;
    const lang = e.target.lang;
    setRawEdits(
      prevState=>
      ({
        ...prevState,
        [id]: {
          ...(prevState[id]),
          [lang]: value
          }
      })
      )
  },[])
  const deleteId = useCallback((e: React.MouseEvent<HTMLInputElement>)=>{
    const id = (e.target as any).dataset.id as string;
    if(newIds.indexOf(id) === -1){ // The id to be deleted is an old id
      setNewIds(prevState=>{
        const index = prevState.indexOf(id)
        if(index!==-1){
          const newState = prevState.slice();
          newState.splice(index,1)
          return newState
        }
        return prevState
      });
    }else{
      setDeletedIds(prevState=>[...prevState,id])
    }
    setRawEdits(prevState=>{
      if(prevState[id]){
        const {[id]:_, ...newState} = prevState
        return newState
      }
      return prevState
    });
  },[newIds])

  const addNewId = useCallback((newId:string)=>{
    const newIds = newId.split(",").map(id=>id.trim()).filter(id=>!allIds.some(el=>(collator.compare(el,id) === 0)))
    setNewIds(prevState=>([...prevState, ...newIds]));
  },[allIds])

return {data, updateCell, addNewId, deleteId, state:{edited: edits, newIds, deletedIds}}
}

