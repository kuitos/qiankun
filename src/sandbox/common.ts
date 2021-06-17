/**
 * @author Kuitos
 * @since 2020-04-13
 */

import { isBoundedFunction, isCallable, isConstructable } from '../utils';
import { WindowType } from '../interfaces';

let currentRunningSandboxProxy: WindowProxy | null;
export function getCurrentRunningSandboxProxy() {
  return currentRunningSandboxProxy;
}

export function setCurrentRunningSandboxProxy(proxy: WindowProxy | null) {
  currentRunningSandboxProxy = proxy;
}

const isWindow = (obj: any) => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const typeofObj = Object.prototype.toString.call(obj);
  if (typeofObj === WindowType.Window || typeofObj === WindowType.DOMWindow || typeofObj === WindowType.global) {
    return true;
  }
  return obj.window === obj;
};

export function getTargetValue(target: any, value: any): any {
  /*
    仅绑定 isCallable && !isBoundedFunction && !isConstructable 的函数对象，如 window.console、window.atob 这类。目前没有完美的检测方式，这里通过 prototype 中是否还有可枚举的拓展方法的方式来判断
    @warning 这里不要随意替换成别的判断方式，因为可能触发一些 edge case（比如在 lodash.isFunction 在 iframe 上下文中可能由于调用了 top window 对象触发的安全异常）
   */
  if (isCallable(value) && !isBoundedFunction(value) && !isConstructable(value)) {
    const boundValue = function boundValue(this: any, ...rest: any[]) {
      return Function.prototype.apply.call(value, typeof this === 'undefined' || isWindow(this) ? target : this, rest);
    } as Record<string, any>;

    // some callable function has custom fields, we need to copy the enumerable props to boundValue. such as moment function.
    // use for..in rather than Object.keys.forEach for performance reason
    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const key in value) {
      boundValue[key] = value[key];
    }

    // copy prototype if bound function not have but target one have
    // as prototype is non-enumerable mostly, we need to copy it from target function manually
    if (value.hasOwnProperty('prototype')) {
      // we should not use assignment operator to set boundValue prototype like `boundValue.prototype = value.prototype`
      // as the assignment will also look up prototype chain while it hasn't own prototype property,
      // when the lookup succeed, the assignment will throw an TypeError like `Cannot assign to read only property 'prototype' of function` if its descriptor configured with writable false or just have a getter accessor
      // see https://github.com/umijs/qiankun/issues/1121
      Object.defineProperty(boundValue, 'prototype', { value: value.prototype, enumerable: false, writable: true });
    }

    return boundValue;
  }

  return value;
}

const getterInvocationResultMap = new WeakMap<CallableFunction, any>();

export function getProxyPropertyValue(getter: CallableFunction) {
  const getterResult = getterInvocationResultMap.get(getter);
  if (!getterResult) {
    const result = getter();
    getterInvocationResultMap.set(getter, result);
    return result;
  }

  return getterResult;
}
