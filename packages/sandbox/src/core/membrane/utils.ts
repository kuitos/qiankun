import {
  create,
  defineProperty,
  freeze,
  getOwnPropertyDescriptor,
  getOwnPropertyNames,
  hasOwnProperty,
  keys,
} from '@qiankunjs/shared';
import { isBoundedFunction, isCallable, isConstructable } from '../../utils';
import { globalsInBrowser } from '../globals';
import { array2TruthyObject } from '../utils';
import type { Endowments, MembraneTarget } from './index';

export const isPropertyDescriptor = (v: unknown): boolean => {
  return (
    typeof v === 'object' &&
    v !== null &&
    ['value', 'writable', 'get', 'set', 'configurable', 'enumerable'].some((p) => p in v)
  );
};

const cachedGlobalsInBrowser = array2TruthyObject(
  globalsInBrowser.concat(process.env.NODE_ENV === 'test' ? ['mockNativeWindowFunction'] : []),
);
export const isNativeGlobalProp = (prop: string): boolean => {
  return prop in cachedGlobalsInBrowser;
};

export function createMembraneTarget(
  endowments: Endowments = {},
  incubatorContext: WindowProxy,
): {
  target: MembraneTarget;
  propertiesWithGetter: Map<PropertyKey, boolean>;
} {
  // map always has the best performance in `has` check scenario
  // see https://jsperf.com/array-indexof-vs-set-has/23
  const propertiesWithGetter = new Map<PropertyKey, boolean>();
  const target: MembraneTarget = keys(endowments).reduce((acc, key) => {
    const value = endowments[key];
    if (isPropertyDescriptor(value)) {
      defineProperty(acc, key, value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as MembraneTarget);

  /*
   copy the non-configurable property of incubatorContext to membrane target to avoid TypeError
   see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/getOwnPropertyDescriptor
   > A property cannot be reported as non-configurable, if it does not exist as an own property of the target object or if it exists as a configurable own property of the target object.
   */
  getOwnPropertyNames(incubatorContext)
    .filter((p) => {
      const descriptor = getOwnPropertyDescriptor(incubatorContext, p);
      return !hasOwnProperty(endowments, p) && !descriptor?.configurable;
    })
    .forEach((p) => {
      const descriptor = getOwnPropertyDescriptor(incubatorContext, p);
      if (descriptor) {
        const hasGetter = hasOwnProperty(descriptor, 'get');
        if (hasGetter) {
          propertiesWithGetter.set(p, true);
        }

        defineProperty(
          target,
          p,
          // freeze the descriptor to avoid being modified by zone.js
          // see https://github.com/angular/zone.js/blob/a5fe09b0fac27ac5df1fa746042f96f05ccb6a00/lib/browser/define-property.ts#L71
          freeze(descriptor),
        );
      }
    });

  return {
    target,
    propertiesWithGetter,
  };
}

/**
 * fastest(at most time) unique array method
 * @see https://jsperf.com/array-filter-unique/30
 */
export function uniq(array: Array<string | symbol>) {
  return array.filter(function (this: Record<string | symbol, boolean>, element) {
    return element in this ? false : (this[element] = true);
  }, create(null));
}

const functionBoundedValueMap = new WeakMap<CallableFunction, CallableFunction>();
export function rebindTarget2Fn<T>(target: unknown, fn: T, receiver: unknown): T {
  /*
    仅绑定 isCallable && !isBoundedFunction && !isConstructable 的函数对象，如 window.console、window.atob 这类，不然微应用中调用时会抛出 Illegal invocation 异常
    目前没有完美的检测方式，这里通过 prototype 中是否还有可枚举的拓展方法的方式来判断
    @warning 这里不要随意替换成别的判断方式，因为可能触发一些 edge case（比如在 lodash.isFunction 在 iframe 上下文中可能由于调用了 top window 对象触发的安全异常）
   */
  if (isCallable(fn) && !isBoundedFunction(fn) && !isConstructable(fn as CallableFunction)) {
    const typedValue = fn as CallableFunction;
    const cachedBoundFunction = functionBoundedValueMap.get(typedValue);
    if (cachedBoundFunction) {
      return cachedBoundFunction as T;
    }

    const boundValue = function proxyFunction(...args: unknown[]): unknown {
      return Function.prototype.apply.call(
        typedValue,
        target,
        args.map((arg) => (arg === receiver ? target : arg)),
      );
    };

    // some callable function has custom fields, we need to copy the own props to boundValue. such as moment function.
    getOwnPropertyNames(typedValue).forEach((key) => {
      // boundValue might be a proxy, we need to check the key whether exist in it
      if (!hasOwnProperty(boundValue, key)) {
        defineProperty(boundValue, key, getOwnPropertyDescriptor(typedValue, key)!);
      }
    });

    // copy prototype if bound function not have but target one have
    // as prototype is non-enumerable mostly, we need to copy it from target function manually
    if (hasOwnProperty(typedValue, 'prototype') && !hasOwnProperty(boundValue, 'prototype')) {
      // we should not use assignment operator to set boundValue prototype like `boundValue.prototype = typedValue.prototype`
      // as the assignment will also look up prototype chain while it hasn't own prototype property,
      // when the lookup succeed, the assignment will throw an TypeError like `Cannot assign to read only property 'prototype' of function` if its descriptor configured with writable false or just have a getter accessor
      // see https://github.com/umijs/qiankun/issues/1121
      defineProperty(boundValue, 'prototype', {
        value: typedValue.prototype as unknown,
        enumerable: false,
        writable: true,
      });
    }

    // Some util, like `function isNative() {  return typeof Ctor === 'function' && /native code/.test(Ctor.toString()) }` relies on the original `toString()` result
    // but bound functions will always return "function() {[native code]}" for `toString`, which is misleading
    if (typeof typedValue.toString === 'function') {
      const valueHasInstanceToString =
        hasOwnProperty(typedValue, 'toString') && !hasOwnProperty(boundValue, 'toString');
      const boundValueHasPrototypeToString = boundValue.toString === Function.prototype.toString;

      if (valueHasInstanceToString || boundValueHasPrototypeToString) {
        const originToStringDescriptor = getOwnPropertyDescriptor(
          valueHasInstanceToString ? fn : Function.prototype,
          'toString',
        );

        Object.defineProperty(
          boundValue,
          'toString',
          Object.assign(
            {},
            originToStringDescriptor,
            originToStringDescriptor?.get ? null : { value: () => typedValue.toString() },
          ),
        );
      }
    }

    functionBoundedValueMap.set(fn, boundValue);
    return boundValue as T;
  }

  return fn;
}
