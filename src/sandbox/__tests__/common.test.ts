/**
 * @author Kuitos
 * @since 2021-04-12
 */

import { getTargetValue } from '../common';

describe('getTargetValue', () => {
  it('should work well', () => {
    const a1 = getTargetValue(window, undefined);
    expect(a1).toEqual(undefined);

    const a2 = getTargetValue(window, null);
    expect(a2).toEqual(null);

    const a3 = getTargetValue(window, function bindThis(this: any) {
      return this;
    });
    const a3returns = a3();
    expect(a3returns).toEqual(window);
  });

  it('should work well while function added prototype methods after first running', () => {
    function prototypeAddedAfterFirstInvocation(this: any, field: string) {
      this.field = field;
    }
    const notConstructableFunction = getTargetValue(window, prototypeAddedAfterFirstInvocation);
    // `this` of not constructable function will be bound automatically, but it can be changed by calling with special `this`
    const result = {};
    notConstructableFunction('123');
    expect(result).toStrictEqual({});
    expect(window.field).toEqual('123');

    notConstructableFunction.call(result, '456');
    expect(result).toStrictEqual({ field: '456' });
    // window.field not be affected
    expect(window.field).toEqual('123');

    prototypeAddedAfterFirstInvocation.prototype.addedFn = () => {};
    const constructableFunction = getTargetValue(window, prototypeAddedAfterFirstInvocation);
    // `this` coule also be available when it be predicated as a constructable function
    const result3 = {};
    constructableFunction.call(result3, '789');
    expect(result3).toStrictEqual({ field: '789' });
    expect(window.field).toEqual('123');
  });

  it('should work well while value have a readonly prototype on its prototype chain', () => {
    function callableFunction() {}

    const functionWithReadonlyPrototype = () => {};
    Object.defineProperty(functionWithReadonlyPrototype, 'prototype', {
      writable: false,
      enumerable: false,
      configurable: false,
      value: 123,
    });

    Object.setPrototypeOf(callableFunction, functionWithReadonlyPrototype);

    const boundFn = getTargetValue(window, callableFunction);
    expect(boundFn.prototype).toBe(callableFunction.prototype);
  });
});
