import { useEffect, useState } from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import type { IMapping, IOptionSource } from 'src/types';

interface IUseGetDataListParams {
  id?: string;
  mapping?: IMapping;
  source?: IOptionSource;
}

export const useGetDataList = ({ id }: IUseGetDataListParams) => {
  const dataListState = useAppSelector((state) => state.dataListState.dataLists);
  const [dataList, setDataList] = useState<any>(undefined);
  useEffect(() => {
    if (id) {
      setDataList(dataListState[id]?.listItems);
    }
  }, [id, dataListState]);
  return dataList;
};
