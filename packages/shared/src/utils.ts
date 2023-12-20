/**
 * @author Kuitos
 * @since 2023-04-26
 */

// eslint-disable-next-line @typescript-eslint/unbound-method
export const { create, defineProperty, getOwnPropertyDescriptor, getOwnPropertyNames, freeze, keys } = Object;
export const hasOwnProperty = (caller: unknown, p: PropertyKey) => Object.prototype.hasOwnProperty.call(caller, p);

export class Deferred<T> {
  promise: Promise<T>;

  #status: 'pending' | 'fulfilled' | 'rejected' = 'pending';

  resolve!: (value: T | PromiseLike<T>) => void;

  reject!: (reason?: unknown) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = (value) => {
        this.#status = 'fulfilled';
        resolve(value);
      };
      this.reject = (reason) => {
        this.#status = 'rejected';
        reject(reason);
      };
    });
  }

  isSettled(): boolean {
    return this.#status !== 'pending';
  }
}

export async function waitUntilSettled(promise: Promise<void>): Promise<void> {
  try {
    await promise;
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('waitUntilSettled error', e);
    }
  }
}

export function getEntireUrl(uri: string, baseURI: string): string {
  const publicPath = new URL(baseURI, window.location.href);
  const entireUrl = new URL(uri, publicPath.toString());
  return entireUrl.toString();
}

/**
 * Check if the running environment support qiankun 3.0
 *
 */
export function isRuntimeCompatible(): boolean {
  return (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    typeof Proxy === 'function' && typeof TransformStream === 'function' && typeof URL?.createObjectURL === 'function'
  );
}
