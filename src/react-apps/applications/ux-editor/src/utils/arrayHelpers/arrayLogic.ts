import { createSelector } from 'reselect';

const pushOrPop = (object: any, array: Array<any>) => {
  const tempObj = array.find((o: any) => o.id === object.id);
  if (!tempObj) {
    array.push(object);
    sortByOrder(array);
    return array;
  } else  {
    array.pop(tempObj);
    return array;
  }
};

const sortByOrder = (array: Array<any>) => {
  array.sort(compareOrderNum);
  return array;
};

const compareOrderNum = (a: any, b: any) => {
  if (a.order < b.order) {
    return -1;
  }
  if (a.order > b.order) {
    return 1;
  }
  return 0;
};

const getArray = () => {
  return createSelector(
    [pushOrPop],
    (object: any, array: Array<any>) => {
      return array;
    },
  );
};

const getSortedArray = () => {
  return createSelector(
    [sortByOrder],
    (array: Array<any>) => {
      return array;
    },
  );
};

export const addToOrDeleteFromArray = getArray;
export const sortArray = getSortedArray;
