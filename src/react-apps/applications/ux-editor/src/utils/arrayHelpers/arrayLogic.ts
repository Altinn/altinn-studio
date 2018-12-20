import { createSelector } from 'reselect';

const pushOrPop = (obj: any) => {
  const tempObj = obj.array.find((o: any) => o.id === obj.object.id);
  if (!tempObj) {
    obj.array.push(obj.object);
    sortByOrder(obj.array);
  } else {
    const index = obj.array.indexOf(tempObj);
    obj.array.splice(index, 1);
  }
  markFirstObject(obj.array);
  const clone = obj.array.map((a: any) => Object.assign({}, a));
  obj.array = clone;
  console.log(obj.array);
  return obj;
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

const markFirstObject = (array: Array<any>) => {
  for (let i = 0; i <= array.length - 1; i++) {
    if (i === 0) {
      array[i].firstInActiveList = true;
    } else {
      array[i].firstInActiveList = false;
    }
  }
  return array;
};

const getArray = () => {
  return createSelector(
    pushOrPop,
    (obj: any) => {
      return obj.array;
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
