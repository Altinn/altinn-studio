import { createSelector } from 'reselect';

export interface IUpdateArrayObj {
  array: any[];
  object: any;
}

export interface ITwoArraysObj {
  array: any[];
  order: any[];
}

const changeOrderNum = ({array, order}: ITwoArraysObj) => {
  array.forEach((component: any) => {
    if (order.indexOf(component.id) >= 0) {
      component.order = order.indexOf(component.id);
    }
  });
  markFirstAndLastObject(array);
  const cloneOfObj = JSON.parse(JSON.stringify({ array, order }));
  return cloneOfObj;
};

const findMissing = (a: any[]) => {
  const maximum = Math.max.apply(
    Math,
    a.map((o) => {
      return o.order;
    }),
  );
  const minimum = Math.min.apply(
    Math,
    a.map((o) => {
      return o.order;
    }),
  );
  let index = 0;
  Array.from(Array(maximum).keys()).forEach((i: number) => {
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
  const handleMissingInOrder = findMissing(array);
  return handleMissingInOrder;
};

const getSortedArray = () => {
  return createSelector(changeOrderNum, (obj: ITwoArraysObj) => {
    return obj.array;
  });
};

export const sortArray = getSortedArray;
