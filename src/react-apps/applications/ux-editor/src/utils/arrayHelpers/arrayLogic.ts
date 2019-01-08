import { createSelector } from 'reselect';

const pushOrPop = (obj: any) => {
  const tempObj = obj.array.find((o: any) => o.id === obj.object.id);
  if (!tempObj) {
    obj.array.push(obj.object);
    obj.array.sort(compareOrderNum);
  } else {
    const index = obj.array.indexOf(tempObj);
    obj.array.splice(index, 1);
  }
  if (obj.array.length > 0) {
    markFirstAndLastObject(obj.array);
  }
  const cloneOfObj = JSON.parse(JSON.stringify(obj));
  return cloneOfObj;
};

const changeOrderNum = (obj: any) => {
  obj.array.forEach((component: any) => {
    if (obj.order.indexOf(component.id) >= 0) {
      component.order = obj.order.indexOf(component.id);
    }
  });
  const cloneOfObj = JSON.parse(JSON.stringify(obj));
  return cloneOfObj;
};

const compareOrderNum = (a: any, b: any) => {
  if (a.order < b.order) {
    return -1;
  } else if (a.order > b.order) {
    return 1;
  } else if (a.order === b.order) {
    b.order = a.order + 1;
  }
  return 0;
};

const findMissing = (a: any[]) => {
  const maximum = Math.max.apply(Math, a.map((o) => {
    return o.order;
  }));
  const minimum = Math.min.apply(Math, a.map((o) => {
    return o.order;
  }));
  let index = 0;
  Array.from(Array(maximum).keys()).map((i: number) => {
    const obj = a.find((x: any) => x.order === i);
    if (obj) {
      index = a.indexOf(obj);
    }
    if (!obj && i > minimum) {
      a[index].lastInActiveList = true;
      a[index + 1].firstInActiveList = true;
    }
  });
  return a;
};

const markFirstAndLastObject = (array: any[]) => {
  for (let i = 0; i <= array.length - 1; i++) {
    if (i === 0 && array.length === 1) {
      array[i].firstInActiveList = true;
      array[i].lastInActiveList = true;
    } else if (i === 0 && array.length > 1) {
      array[i].firstInActiveList = true;
      array[i].lastInActiveList = false;
    } else if (i === array.length - 1) {
      array[i].firstInActiveList = false;
      array[i].lastInActiveList = true;
    } else {
      array[i].firstInActiveList = false;
      array[i].lastInActiveList = false;
    }
  }
  const sorted = findMissing(array);
  return sorted;
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
    changeOrderNum,
    (obj: any) => {
      return obj.array;
    },
  );
};

export const addToOrDeleteFromArray = getArray;
export const sortArray = getSortedArray;
