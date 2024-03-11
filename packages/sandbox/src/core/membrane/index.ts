/* eslint-disable no-param-reassign */
import { defineProperty, getOwnPropertyDescriptor, hasOwnProperty, keys } from '@qiankunjs/shared';
import { nativeGlobal } from '../../consts';
import { isPropertyFrozen } from '../../utils';
import type { Disposable } from '../sandbox/types';
import { createMembraneTarget, isNativeGlobalProp, rebindTarget2Fn, uniq } from './utils';

declare global {
  interface Window {
    __QIANKUN_DEVELOPMENT__?: boolean;
  }
}

export type MembraneTarget = Record<string | symbol, unknown>;
export type Endowments = Record<string, number | string | CallableFunction | PropertyDescriptor>;

type SymbolTarget = 'target' | 'globalContext';

const variableWhiteListInDev =
  process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || window.__QIANKUN_DEVELOPMENT__
    ? [
        // for react hot reload
        // see https://github.com/facebook/create-react-app/blob/66bf7dfc43350249e2f09d138a20840dae8a0a4a/packages/react-error-overlay/src/index.js#L180
        '__REACT_ERROR_OVERLAY_GLOBAL_HOOK__',
        // for react development event issue, see https://github.com/umijs/qiankun/issues/2375
        'event',
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

export class Membrane implements Disposable {
  private locking = false;

  private readonly realmContextHandler: ProxyHandler<MembraneTarget>;
  realmContext: WindowProxy;

  modifications = new Set<PropertyKey>();

  target: MembraneTarget;

  latestSetProp?: PropertyKey;

  constructor(
    incubatorContext: WindowProxy,
    unscopables: Record<string, true>,
    opts?: {
      whitelist?: string[];
      endowments?: Endowments;
    },
  ) {
    const { endowments = {} } = opts || {};
    const whitelistVars = [...(opts?.whitelist || []), ...globalVariableWhiteList];
    const descriptorTargetMap = new Map<PropertyKey, SymbolTarget>();

    const { target, propertiesWithGetter } = createMembraneTarget(endowments, incubatorContext);

    this.target = target;
    this.realmContextHandler = {
      set: (membraneTarget, p, value: never) => {
        if (!this.locking) {
          // sync the property to incubatorContext
          if (typeof p === 'string' && whitelistVars.indexOf(p) !== -1) {
            // this.globalWhitelistPrevDescriptor[p] = Object.getOwnPropertyDescriptor(incubatorContext, p);
            incubatorContext[p as never] = value;
          } else {
            // We must keep its description while the property existed in incubatorContext before
            if (!hasOwnProperty(membraneTarget, p) && hasOwnProperty(incubatorContext, p)) {
              const descriptor = getOwnPropertyDescriptor(incubatorContext, p);
              const { writable, configurable, enumerable } = descriptor!;
              // only writable property can be overwritten
              // here we ignored accessor descriptor of incubatorContext as it makes no sense to trigger its logic(which might make sandbox escaping instead)
              // we force to set value by data descriptor
              if (writable || hasOwnProperty(descriptor, 'set')) {
                defineProperty(membraneTarget, p, { configurable, enumerable, writable: true, value });
              }
            } else {
              membraneTarget[p] = value;
            }
          }

          this.modifications.add(p);

          this.latestSetProp = p;

          return true;
        }

        if (process.env.NODE_ENV === 'development') {
          // console.warn(`[qiankun] Set window.${p.toString()} while sandbox destroyed or inactive in ${name}!`);
          console.warn(`[qiankun] Set window.${p.toString()} while sandbox destroyed or inactive!`);
        }

        // 在 strict-mode 下，Proxy 的 handler.set 返回 false 会抛出 TypeError，在沙箱卸载的情况下应该忽略错误
        return true;
      },

      get: (membraneTarget, p, receiver) => {
        if (p === Symbol.unscopables) return unscopables;

        // properties in endowments returns directly
        if (hasOwnProperty(endowments, p)) {
          return membraneTarget[p];
        }

        if (p === 'string' && whitelistVars.indexOf(p) !== -1) {
          return incubatorContext[p as never];
        }

        const actualTarget = propertiesWithGetter.has(p)
          ? incubatorContext
          : p in membraneTarget
            ? membraneTarget
            : incubatorContext;
        const value = actualTarget[p as never];

        // frozen value should return directly, see https://github.com/umijs/qiankun/issues/2015
        if (isPropertyFrozen(actualTarget, p)) {
          return value;
        }

        // non-native property return directly to avoid rebind
        if (!isNativeGlobalProp(p as string) && !useNativeWindowForBindingsProps.has(p)) {
          return value;
        }

        /* Some dom api must be bound to native window, otherwise it would cause exception like 'TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation'
         See this code:
           const proxy = new Proxy(window, {});
           const proxyFetch = fetch.bind(proxy);
           proxyFetch('https://qiankun.com');
      */
        const boundTarget = useNativeWindowForBindingsProps.get(p) ? nativeGlobal : incubatorContext;
        return rebindTarget2Fn(boundTarget, value, receiver);
      },

      // trap in operator
      // see https://github.com/styled-components/styled-components/blob/master/packages/styled-components/src/constants.js#L12
      has(membraneTarget: MembraneTarget, p: string | number | symbol): boolean {
        return p in membraneTarget || p in incubatorContext;
      },

      getOwnPropertyDescriptor(
        membraneTarget: MembraneTarget,
        p: string | number | symbol,
      ): PropertyDescriptor | undefined {
        /*
         as the descriptor of top/self/window/mockTop in raw window are configurable but not in proxy membraneTarget, we need to get it from membraneTarget to avoid TypeError
         see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/getOwnPropertyDescriptor
         > A property cannot be reported as non-configurable, if it does not exist as an own property of the membraneTarget object or if it exists as a configurable own property of the membraneTarget object.
         */
        if (hasOwnProperty(membraneTarget, p)) {
          const descriptor = getOwnPropertyDescriptor(membraneTarget, p);
          descriptorTargetMap.set(p, 'target');
          return descriptor;
        }

        if (hasOwnProperty(incubatorContext, p)) {
          const descriptor = getOwnPropertyDescriptor(incubatorContext, p);
          descriptorTargetMap.set(p, 'globalContext');
          // A property cannot be reported as non-configurable, if it does not exist as an own property of the membraneTarget object
          if (descriptor && !descriptor.configurable) {
            descriptor.configurable = true;
          }
          return descriptor;
        }

        return undefined;
      },

      // trap to support iterator with sandbox
      ownKeys(membraneTarget: MembraneTarget): ArrayLike<string | symbol> {
        return uniq(Reflect.ownKeys(incubatorContext).concat(Reflect.ownKeys(membraneTarget)));
      },

      defineProperty: (membraneTarget, p, attributes) => {
        const from = descriptorTargetMap.get(p);
        /*
         Descriptor must be defined to native window while it comes from native window via Object.getOwnPropertyDescriptor(window, p),
         otherwise it would cause a TypeError with illegal invocation.
         */
        switch (from) {
          case 'globalContext':
            return Reflect.defineProperty(incubatorContext, p, attributes);
          default:
            return Reflect.defineProperty(membraneTarget, p, attributes);
        }
      },

      deleteProperty: (membraneTarget, p) => {
        if (hasOwnProperty(membraneTarget, p)) {
          delete membraneTarget[p];
          this.modifications.delete(p);

          return true;
        }

        return true;
      },

      // makes sure `window instanceof Window` returns truthy in micro app
      getPrototypeOf() {
        return Reflect.getPrototypeOf(incubatorContext);
      },
    };
    this.realmContext = new Proxy(target, this.realmContextHandler) as unknown as WindowProxy;
  }

  addIntrinsics(
    intrinsics:
      | Record<string, PropertyDescriptor>
      | ((rawTarget: MembraneTarget) => Record<string, PropertyDescriptor>),
  ): void {
    const intrinsicsObj = typeof intrinsics === 'function' ? intrinsics(this.target) : intrinsics;
    keys(intrinsicsObj).forEach((key) => {
      defineProperty(this.target, key, intrinsicsObj[key]);
    });
  }

  lock() {
    this.locking = true;
  }

  unlock() {
    this.locking = false;
  }

  dispose() {
    Proxy.revocable(this.realmContext, this.realmContextHandler as unknown as ProxyHandler<WindowProxy>);
  }
}
