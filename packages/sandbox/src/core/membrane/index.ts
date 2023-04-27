import { without } from 'lodash';
import { nativeGlobal } from '../../consts';
import { isPropertyFrozen } from '../../utils';
import { getTargetValue } from './utils';

declare global {
  interface Window {
    __QIANKUN_DEVELOPMENT__?: boolean;
  }
}

type FakeWindow = Window & Record<PropertyKey, any>;
type SymbolTarget = 'target' | 'globalContext';

// zone.js will overwrite Object.defineProperty
const rawObjectDefineProperty = Object.defineProperty;

const inTest = process.env.NODE_ENV === 'test';
const mockSafariTop = 'mockSafariTop';
const mockTop = 'mockTop';
const mockGlobalThis = 'mockGlobalThis';

// these globals should be recorded while accessing every time
const accessingSpiedGlobals = ['document', 'top', 'parent', 'eval'];
const overwrittenGlobals = ['window', 'self', 'globalThis', 'hasOwnProperty'].concat(inTest ? [mockGlobalThis] : []);
const globals = ['window', 'this'];
export const cachedGlobals = Array.from(
  new Set(without(globals.concat(overwrittenGlobals).concat('requestAnimationFrame'), ...accessingSpiedGlobals)),
);

// transform cachedGlobals to object for faster element check
const cachedGlobalObjects = cachedGlobals.reduce((acc, globalProp) => ({ ...acc, [globalProp]: true }), {});

const variableWhiteListInDev =
  process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || window.__QIANKUN_DEVELOPMENT__
    ? [
        // for react hot reload
        // see https://github.com/facebook/create-react-app/blob/66bf7dfc43350249e2f09d138a20840dae8a0a4a/packages/react-error-overlay/src/index.js#L180
        '__REACT_ERROR_OVERLAY_GLOBAL_HOOK__',
      ]
    : [];
// who could escape the sandbox
const globalVariableWhiteList: string[] = [
  // FIXME System.js used a indirect call with eval, which would make it scope escape to global
  // To make System.js works well, we write it back to global window temporary
  // see https://github.com/systemjs/systemjs/blob/457f5b7e8af6bd120a279540477552a07d5de086/src/evaluate.js#L106
  'System',

  // see https://github.com/systemjs/systemjs/blob/457f5b7e8af6bd120a279540477552a07d5de086/src/instantiate.js#L357
  '__cjsWrapper',
  ...variableWhiteListInDev,
];

const useNativeWindowForBindingsProps = new Map<PropertyKey, boolean>([
  ['fetch', true],
  ['mockDomAPIInBlackList', process.env.NODE_ENV === 'test'],
]);

export function createMembrane(
  globalContext: Window,
  unscopables: Record<string, true>,
  whitelistVariables = globalVariableWhiteList,
  extraContext: Record<string, any> = {},
) {
  const { fakeWindow, propertiesWithGetter } = createFakeWindow(globalContext, extraContext);
  const descriptorTargetMap = new Map<PropertyKey, SymbolTarget>();

  const modifications = new Set<PropertyKey>();
  let latestSetProp: PropertyKey | undefined;
  let locking = false;

  const membrane = new Proxy(fakeWindow, {
    set: (target: FakeWindow, p: PropertyKey, value: any): boolean => {
      if (!locking) {
        // We must keep its description while the property existed in globalContext before
        if (!target.hasOwnProperty(p) && globalContext.hasOwnProperty(p)) {
          const descriptor = Object.getOwnPropertyDescriptor(globalContext, p);
          const { writable, configurable, enumerable, set } = descriptor!;
          // only writable property can be overwritten
          // here we ignored accessor descriptor of globalContext as it makes no sense to trigger its logic(which might make sandbox escaping instead)
          // we force to set value by data descriptor
          if (writable || set) {
            Object.defineProperty(target, p, { configurable, enumerable, writable: true, value });
          }
        } else {
          target[p] = value;
        }

        // sync the property to globalContext
        if (typeof p === 'string' && whitelistVariables.indexOf(p) !== -1) {
          // this.globalWhitelistPrevDescriptor[p] = Object.getOwnPropertyDescriptor(globalContext, p);
          // @ts-ignore
          globalContext[p] = value;
        }

        modifications.add(p);

        latestSetProp = p;

        return true;
      }

      if (process.env.NODE_ENV === 'development') {
        console.warn(`[qiankun] Set window.${p.toString()} while sandbox destroyed or inactive in ${name}!`);
      }

      // 在 strict-mode 下，Proxy 的 handler.set 返回 false 会抛出 TypeError，在沙箱卸载的情况下应该忽略错误
      return true;
    },

    get: (target: FakeWindow, p: PropertyKey, receiver): any => {
      if (p === Symbol.unscopables) return unscopables;
      // avoid who using window.window or window.self to escape the sandbox environment to touch the real window
      // see https://github.com/eligrey/FileSaver.js/blob/master/src/FileSaver.js#L13
      if (p === 'window' || p === 'self') {
        return receiver;
      }

      // hijack globalWindow accessing with globalThis keyword
      if (p === 'globalThis' || (inTest && p === mockGlobalThis)) {
        return receiver;
      }

      if (p === 'top' || p === 'parent' || (inTest && (p === mockTop || p === mockSafariTop))) {
        // if your master app in an iframe context, allow these props escape the sandbox
        if (globalContext === globalContext.parent) {
          return receiver;
        }
        return (globalContext as any)[p];
      }

      // proxy.hasOwnProperty would invoke getter firstly, then its value represented as globalContext.hasOwnProperty
      if (p === 'hasOwnProperty') {
        return hasOwnProperty;
      }

      // if (p === 'document') {
      //   return this.document;
      // }

      if (p === 'eval') {
        return eval;
      }

      const actualTarget = propertiesWithGetter.has(p) ? globalContext : p in target ? target : globalContext;
      const value = actualTarget[p as any];

      // frozen value should return directly, see https://github.com/umijs/qiankun/issues/2015
      if (isPropertyFrozen(actualTarget, p)) {
        return value;
      }

      /* Some dom api must be bound to native window, otherwise it would cause exception like 'TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation'
         See this code:
           const proxy = new Proxy(window, {});
           const proxyFetch = fetch.bind(proxy);
           proxyFetch('https://qiankun.com');
      */
      const boundTarget = useNativeWindowForBindingsProps.get(p) ? nativeGlobal : globalContext;
      return getTargetValue(boundTarget, value);
    },

    // trap in operator
    // see https://github.com/styled-components/styled-components/blob/master/packages/styled-components/src/constants.js#L12
    has(target: FakeWindow, p: string | number | symbol): boolean {
      // property in cachedGlobalObjects must return true to avoid escape from get trap
      return p in cachedGlobalObjects || p in target || p in globalContext;
    },

    getOwnPropertyDescriptor(target: FakeWindow, p: string | number | symbol): PropertyDescriptor | undefined {
      /*
       as the descriptor of top/self/window/mockTop in raw window are configurable but not in proxy target, we need to get it from target to avoid TypeError
       see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/getOwnPropertyDescriptor
       > A property cannot be reported as non-configurable, if it does not exist as an own property of the target object or if it exists as a configurable own property of the target object.
       */
      if (target.hasOwnProperty(p)) {
        const descriptor = Object.getOwnPropertyDescriptor(target, p);
        descriptorTargetMap.set(p, 'target');
        return descriptor;
      }

      if (globalContext.hasOwnProperty(p)) {
        const descriptor = Object.getOwnPropertyDescriptor(globalContext, p);
        descriptorTargetMap.set(p, 'globalContext');
        // A property cannot be reported as non-configurable, if it does not exist as an own property of the target object
        if (descriptor && !descriptor.configurable) {
          descriptor.configurable = true;
        }
        return descriptor;
      }

      return undefined;
    },

    // trap to support iterator with sandbox
    ownKeys(target: FakeWindow): ArrayLike<string | symbol> {
      return uniq(Reflect.ownKeys(globalContext).concat(Reflect.ownKeys(target)));
    },

    defineProperty: (target: Window, p: PropertyKey, attributes: PropertyDescriptor): boolean => {
      const from = descriptorTargetMap.get(p);
      /*
       Descriptor must be defined to native window while it comes from native window via Object.getOwnPropertyDescriptor(window, p),
       otherwise it would cause a TypeError with illegal invocation.
       */
      switch (from) {
        case 'globalContext':
          return Reflect.defineProperty(globalContext, p, attributes);
        default:
          return Reflect.defineProperty(target, p, attributes);
      }
    },

    deleteProperty: (target: FakeWindow, p: string | number | symbol): boolean => {
      if (target.hasOwnProperty(p)) {
        // @ts-ignore
        delete target[p];
        modifications.delete(p);

        return true;
      }

      return true;
    },

    // makes sure `window instanceof Window` returns truthy in micro app
    getPrototypeOf() {
      return Reflect.getPrototypeOf(globalContext);
    },
  });

  function hasOwnProperty(this: any, key: PropertyKey): boolean {
    // calling from hasOwnProperty.call(obj, key)
    if (this !== membrane && this !== null && typeof this === 'object') {
      return Object.prototype.hasOwnProperty.call(this, key);
    }

    return fakeWindow.hasOwnProperty(key) || globalContext.hasOwnProperty(key);
  }

  return {
    get instance() {
      return membrane;
    },
    get modifications() {
      return modifications;
    },
    get latestSetProp() {
      return latestSetProp;
    },
    lock: () => (locking = true),
    unlock: () => (locking = false),
  };
}

function createFakeWindow(
  globalContext: Window,
  extraContext?: Record<string, any>,
): {
  fakeWindow: FakeWindow;
  propertiesWithGetter: Map<PropertyKey, boolean>;
} {
  // map always has the best performance in `has` check scenario
  // see https://jsperf.com/array-indexof-vs-set-has/23
  const propertiesWithGetter = new Map<PropertyKey, boolean>();
  const fakeWindow = extraContext || ({} as FakeWindow);

  /*
   copy the non-configurable property of global to fakeWindow
   see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/getOwnPropertyDescriptor
   > A property cannot be reported as non-configurable, if it does not exist as an own property of the target object or if it exists as a configurable own property of the target object.
   */
  Object.getOwnPropertyNames(globalContext)
    .filter((p) => {
      const descriptor = Object.getOwnPropertyDescriptor(globalContext, p);
      return !descriptor?.configurable;
    })
    .forEach((p) => {
      const descriptor = Object.getOwnPropertyDescriptor(globalContext, p);
      if (descriptor) {
        const hasGetter = Object.prototype.hasOwnProperty.call(descriptor, 'get');

        /*
         make top/self/window property configurable and writable, otherwise it will cause TypeError while get trap return.
         see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/get
         > The value reported for a property must be the same as the value of the corresponding target object property if the target object property is a non-writable, non-configurable data property.
         */
        if (
          p === 'top' ||
          p === 'parent' ||
          p === 'self' ||
          p === 'window' ||
          // window.document is overwriting
          p === 'document' ||
          (inTest && (p === mockTop || p === mockSafariTop))
        ) {
          descriptor.configurable = true;
          /*
           The descriptor of window.window/window.top/window.self in Safari/FF are accessor descriptors, we need to avoid adding a data descriptor while it was
           Example:
            Safari/FF: Object.getOwnPropertyDescriptor(window, 'top') -> {get: function, set: undefined, enumerable: true, configurable: false}
            Chrome: Object.getOwnPropertyDescriptor(window, 'top') -> {value: Window, writable: false, enumerable: true, configurable: false}
           */
          if (!hasGetter) {
            descriptor.writable = true;
          }
        }

        if (hasGetter) propertiesWithGetter.set(p, true);

        // freeze the descriptor to avoid being modified by zone.js
        // see https://github.com/angular/zone.js/blob/a5fe09b0fac27ac5df1fa746042f96f05ccb6a00/lib/browser/define-property.ts#L71
        rawObjectDefineProperty(fakeWindow, p, Object.freeze(descriptor));
      }
    });

  return {
    fakeWindow,
    propertiesWithGetter,
  };
}

/**
 * fastest(at most time) unique array method
 * @see https://jsperf.com/array-filter-unique/30
 */
function uniq(array: Array<string | symbol>) {
  return array.filter(function filter(this: PropertyKey[], element) {
    return element in this ? false : ((this as any)[element] = true);
  }, Object.create(null));
}
