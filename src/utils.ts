/**
 * @author Kuitos
 * @since 2019-05-15
 */
import { isFunction, memoize, once, snakeCase } from 'lodash';
import type { FrameworkConfiguration } from './interfaces';
import { version } from './version';

export function toArray<T>(array: T | T[]): T[] {
  return Array.isArray(array) ? array : [array];
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Promise.then might be synchronized in Zone.js context, we need to use setTimeout instead to mock next tick.
// Since zone.js will hijack the setTimeout callback, and notify angular to do change detection, so we need to use the  __zone_symbol__setTimeout to avoid this, see https://github.com/umijs/qiankun/issues/2384
const nextTick: (cb: () => void) => void =
  typeof window.__zone_symbol__setTimeout === 'function'
    ? window.__zone_symbol__setTimeout
    : (cb) => Promise.resolve().then(cb);

let globalTaskPending = false;

/**
 * Run a callback before next task executing, and the invocation is idempotent in every singular task
 * That means even we called nextTask multi times in one task, only the first callback will be pushed to nextTick to be invoked.
 * @param cb
 */
export function nextTask(cb: () => void): void {
  if (!globalTaskPending) {
    globalTaskPending = true;
    nextTick(() => {
      cb();
      globalTaskPending = false;
    });
  }
}

const fnRegexCheckCacheMap = new WeakMap<any | FunctionConstructor, boolean>();

export function isConstructable(fn: () => any | FunctionConstructor) {
  // prototype methods might be changed while code running, so we need check it every time
  const hasPrototypeMethods =
    fn.prototype && fn.prototype.constructor === fn && Object.getOwnPropertyNames(fn.prototype).length > 1;

  if (hasPrototypeMethods) return true;

  if (fnRegexCheckCacheMap.has(fn)) {
    return fnRegexCheckCacheMap.get(fn);
  }

  /*
    1. 有 prototype 并且 prototype 上有定义一系列非 constructor 属性
    2. 函数名大写开头
    3. class 函数
    满足其一则可认定为构造函数
   */
  let constructable = hasPrototypeMethods;
  if (!constructable) {
    // fn.toString has a significant performance overhead, if hasPrototypeMethods check not passed, we will check the function string with regex
    const fnString = fn.toString();
    const constructableFunctionRegex = /^function\b\s[A-Z].*/;
    const classRegex = /^class\b/;
    constructable = constructableFunctionRegex.test(fnString) || classRegex.test(fnString);
  }

  fnRegexCheckCacheMap.set(fn, constructable);
  return constructable;
}

const callableFnCacheMap = new WeakMap<CallableFunction, boolean>();
export function isCallable(fn: any): boolean {
  if (callableFnCacheMap.has(fn)) {
    return true;
  }

  /**
   * We can not use typeof to confirm it is function as in some safari version
   * typeof document.all === 'undefined' // true
   * typeof document.all === 'function' // true
   */
  const callable = typeof fn === 'function' && fn instanceof Function;
  if (callable) {
    callableFnCacheMap.set(fn, callable);
  }
  return callable;
}

const frozenPropertyCacheMap = new WeakMap<any, Record<PropertyKey, boolean>>();
export function isPropertyFrozen(target: any, p?: PropertyKey): boolean {
  if (!target || !p) {
    return false;
  }

  const targetPropertiesFromCache = frozenPropertyCacheMap.get(target) || {};

  if (targetPropertiesFromCache[p]) {
    return targetPropertiesFromCache[p];
  }

  const propertyDescriptor = Object.getOwnPropertyDescriptor(target, p);
  const frozen = Boolean(
    propertyDescriptor &&
      propertyDescriptor.configurable === false &&
      (propertyDescriptor.writable === false || (propertyDescriptor.get && !propertyDescriptor.set)),
  );

  targetPropertiesFromCache[p] = frozen;
  frozenPropertyCacheMap.set(target, targetPropertiesFromCache);

  return frozen;
}

const boundedMap = new WeakMap<CallableFunction, boolean>();

export function isBoundedFunction(fn: CallableFunction) {
  if (boundedMap.has(fn)) {
    return boundedMap.get(fn);
  }
  /*
   indexOf is faster than startsWith
   see https://jsperf.com/string-startswith/72
   */
  const bounded = fn.name.indexOf('bound ') === 0 && !fn.hasOwnProperty('prototype');
  boundedMap.set(fn, bounded);
  return bounded;
}

export const isConstDestructAssignmentSupported = memoize(() => {
  try {
    new Function('const { a } = { a: 1 }')();
    return true;
  } catch (e) {
    return false;
  }
});

export const qiankunHeadTagName = 'qiankun-head';

export function getDefaultTplWrapper(name: string, sandboxOpts: FrameworkConfiguration['sandbox']) {
  return (tpl: string) => {
    let tplWithSimulatedHead: string;

    if (tpl.indexOf('<head>') !== -1) {
      // We need to mock a head placeholder as native head element will be erased by browser in micro app
      tplWithSimulatedHead = tpl
        .replace('<head>', `<${qiankunHeadTagName}>`)
        .replace('</head>', `</${qiankunHeadTagName}>`);
    } else {
      // Some template might not be a standard html document, thus we need to add a simulated head tag for them
      tplWithSimulatedHead = `<${qiankunHeadTagName}></${qiankunHeadTagName}>${tpl}`;
    }

    return `<div id="${getWrapperId(
      name,
    )}" data-name="${name}" data-version="${version}" data-sandbox-cfg=${JSON.stringify(
      sandboxOpts,
    )}>${tplWithSimulatedHead}</div>`;
  };
}

export function getWrapperId(name: string) {
  return `__qiankun_microapp_wrapper_for_${snakeCase(name)}__`;
}

export const nativeGlobal = new Function('return this')();

export const nativeDocument = new Function('return document')();

const getGlobalAppInstanceMap = once<() => Record<string, number>>(() => {
  if (!nativeGlobal.hasOwnProperty('__app_instance_name_map__')) {
    Object.defineProperty(nativeGlobal, '__app_instance_name_map__', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: {},
    });
  }

  return nativeGlobal.__app_instance_name_map__;
});
/**
 * Get app instance name with the auto-increment approach
 * @param appName
 */
export const genAppInstanceIdByName = (appName: string): string => {
  const globalAppInstanceMap = getGlobalAppInstanceMap();
  if (!(appName in globalAppInstanceMap)) {
    nativeGlobal.__app_instance_name_map__[appName] = 0;
    return appName;
  }

  globalAppInstanceMap[appName]++;
  return `${appName}_${globalAppInstanceMap[appName]}`;
};

/** 校验子应用导出的 生命周期 对象是否正确 */
export function validateExportLifecycle(exports: any) {
  const { bootstrap, mount, unmount } = exports ?? {};
  return isFunction(bootstrap) && isFunction(mount) && isFunction(unmount);
}

export class Deferred<T> {
  promise: Promise<T>;

  resolve!: (value: T | PromiseLike<T>) => void;

  reject!: (reason?: any) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

const supportsUserTiming =
  typeof performance !== 'undefined' &&
  typeof performance.mark === 'function' &&
  typeof performance.clearMarks === 'function' &&
  typeof performance.measure === 'function' &&
  typeof performance.clearMeasures === 'function' &&
  typeof performance.getEntriesByName === 'function';

export function performanceGetEntriesByName(markName: string, type?: string) {
  let marks = null;
  if (supportsUserTiming) {
    marks = performance.getEntriesByName(markName, type);
  }
  return marks;
}

export function performanceMark(markName: string) {
  if (supportsUserTiming) {
    performance.mark(markName);
  }
}

export function performanceMeasure(measureName: string, markName: string) {
  if (supportsUserTiming && performance.getEntriesByName(markName, 'mark').length) {
    performance.measure(measureName, markName);
    performance.clearMarks(markName);
    performance.clearMeasures(measureName);
  }
}

export function isEnableScopedCSS(sandbox: FrameworkConfiguration['sandbox']) {
  if (typeof sandbox !== 'object') {
    return false;
  }

  if (sandbox.strictStyleIsolation) {
    return false;
  }

  return !!sandbox.experimentalStyleIsolation;
}

export function isEnableProxyStyle(sandbox: FrameworkConfiguration['sandbox']) {
  if (typeof sandbox !== 'object') {
    return false;
  }

  if (sandbox.strictStyleIsolation) {
    return false;
  }

  return true;
}

/**
 * copy from https://developer.mozilla.org/zh-CN/docs/Using_XPath
 * @param el
 * @param document
 */
export function getXPathForElement(el: Node, document: Document): string | void {
  // not support that if el not existed in document yet(such as it not append to document before it mounted)
  if (!document.body.contains(el)) {
    return undefined;
  }

  let xpath = '';
  let pos;
  let tmpEle;
  let element = el;

  while (element !== document.documentElement) {
    pos = 0;
    tmpEle = element;
    while (tmpEle) {
      if (tmpEle.nodeType === 1 && tmpEle.nodeName === element.nodeName) {
        // If it is ELEMENT_NODE of the same name
        pos += 1;
      }
      tmpEle = tmpEle.previousSibling;
    }

    xpath = `*[name()='${element.nodeName}'][${pos}]/${xpath}`;

    element = element.parentNode!;
  }

  xpath = `/*[name()='${document.documentElement.nodeName}']/${xpath}`;
  xpath = xpath.replace(/\/$/, '');

  return xpath;
}

export function getContainer(container: string | HTMLElement): HTMLElement | null {
  return typeof container === 'string' ? document.querySelector(container) : container;
}

export function getContainerXPath(container?: string | HTMLElement): string | void {
  if (container) {
    const containerElement = getContainer(container);
    if (containerElement) {
      return getXPathForElement(containerElement, document);
    }
  }

  return undefined;
}
