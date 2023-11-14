/* eslint-disable @typescript-eslint/unbound-method */
/**
 * @author Kuitos
 * @since 2019-10-21
 */
import { prepareScriptForQueue } from '@qiankunjs/shared';
import type { AssetsTranspilerOpts, Deferred, ScriptTranspilerOpts } from '@qiankunjs/shared';
import { qiankunHeadTagName } from '../../consts';
import type { SandboxConfig } from './types';

const SCRIPT_TAG_NAME = 'SCRIPT';
const LINK_TAG_NAME = 'LINK';
const STYLE_TAG_NAME = 'STYLE';

export const styleElementTargetSymbol = Symbol('target');
export const styleElementRefNodeNo = Symbol('refNodeNo');
const overwrittenSymbol = Symbol('qiankun-overwritten');

const scriptFetchedDeferredWeakMap = new WeakMap<HTMLScriptElement, Deferred<void>>();

type DynamicDomMutationTarget = 'head' | 'body';

declare global {
  interface HTMLLinkElement {
    [styleElementTargetSymbol]: DynamicDomMutationTarget;
    [styleElementRefNodeNo]?: Exclude<number, -1>;
  }

  interface HTMLStyleElement {
    [styleElementTargetSymbol]: DynamicDomMutationTarget;
    [styleElementRefNodeNo]?: Exclude<number, -1>;
  }

  interface Function {
    [overwrittenSymbol]: boolean;
  }
}

export const getContainerHeadElement = (container: Element): HTMLHeadElement | null => {
  return container.querySelector(qiankunHeadTagName);
};

export const getContainerBodyElement = (container: Element): HTMLBodyElement => {
  return container as HTMLBodyElement;
};

export function isHijackingTag(tagName?: string) {
  return (
    tagName?.toUpperCase() === LINK_TAG_NAME ||
    tagName?.toUpperCase() === STYLE_TAG_NAME ||
    tagName?.toUpperCase() === SCRIPT_TAG_NAME
  );
}

/**
 * Check if a style element is a styled-component liked.
 * A styled-components liked element is which not have textContext but keep the rules in its styleSheet.cssRules.
 * Such as the style element generated by styled-components and emotion.
 * @param element
 */
export function isStyledComponentsLike(element: HTMLStyleElement): boolean {
  return Boolean(!element.textContent && (element.sheet?.cssRules.length || getStyledElementCSSRules(element)?.length));
}

const appsCounterMap = new Map<string, { bootstrappingPatchCount: number; mountingPatchCount: number }>();

export function calcAppCount(
  appName: string,
  calcType: 'increase' | 'decrease',
  status: 'bootstrapping' | 'mounting',
): void {
  const appCount = appsCounterMap.get(appName) || { bootstrappingPatchCount: 0, mountingPatchCount: 0 };
  switch (calcType) {
    case 'increase':
      appCount[`${status}PatchCount`] += 1;
      break;
    case 'decrease':
      // bootstrap patch just called once but its freer will be called multiple times
      if (appCount[`${status}PatchCount`] > 0) {
        appCount[`${status}PatchCount`] -= 1;
      }
      break;
  }
  appsCounterMap.set(appName, appCount);
}

export function isAllAppsUnmounted(): boolean {
  return Array.from(appsCounterMap.entries()).every(
    ([, { bootstrappingPatchCount: bpc, mountingPatchCount: mpc }]) => bpc === 0 && mpc === 0,
  );
}

const defineNonEnumerableProperty = (target: unknown, key: string | symbol, value: unknown) => {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: false,
    writable: true,
    value,
  });
};

const styledComponentCSSRulesMap = new WeakMap<HTMLStyleElement, CSSRuleList>();

export function recordStyledComponentsCSSRules(styleElements: HTMLStyleElement[]): void {
  styleElements.forEach((styleElement) => {
    /*
     With a styled-components generated style element, we need to record its cssRules for restore next re-mounting time.
     We're doing this because the sheet of style element is going to be cleaned automatically by browser after the style element dom removed from document.
     see https://www.w3.org/TR/cssom-1/#associated-css-style-sheet
     */
    if (styleElement instanceof HTMLStyleElement && isStyledComponentsLike(styleElement)) {
      if (styleElement.sheet) {
        // record the original css rules of the style element for restore
        styledComponentCSSRulesMap.set(styleElement, styleElement.sheet.cssRules);
      }
    }
  });
}

export function getStyledElementCSSRules(styledElement: HTMLStyleElement): CSSRuleList | undefined {
  return styledComponentCSSRulesMap.get(styledElement);
}

export function getOverwrittenAppendChildOrInsertBefore(
  nativeFn: typeof HTMLElement.prototype.appendChild | typeof HTMLElement.prototype.insertBefore,
  getSandboxConfig: (element: HTMLElement) => SandboxConfig | undefined,
  target: DynamicDomMutationTarget = 'body',
) {
  function appendChildInSandbox<T extends Node>(
    this: HTMLHeadElement | HTMLBodyElement,
    newChild: T,
    refChild: Node | null = null,
  ): T {
    const appendChild = nativeFn;

    const element = newChild as unknown as HTMLElement;
    const sandboxConfig = getSandboxConfig(element);

    // no attached sandbox config means the element is not created from the sandbox environment
    if (!isHijackingTag(element.tagName) || !sandboxConfig) {
      return appendChild.call(this, element, refChild) as T;
    }

    if (element.tagName) {
      switch (element.tagName) {
        case LINK_TAG_NAME:
        case STYLE_TAG_NAME: {
          const stylesheetElement = element as HTMLLinkElement | HTMLStyleElement;
          Object.defineProperty(stylesheetElement, styleElementTargetSymbol, {
            value: target,
            writable: true,
            configurable: true,
          });

          const referenceNode = this.contains(refChild) ? refChild : null;
          let refNo: number | undefined;
          if (referenceNode) {
            refNo = Array.from(this.childNodes).indexOf(referenceNode as ChildNode);
          }

          const { sandbox, nodeTransformer, fetch } = sandboxConfig;
          const transpiledStyleSheetElement = nodeTransformer(stylesheetElement, location.href, {
            fetch,
            sandbox,
            rawNode: stylesheetElement,
          });

          const result = appendChild.call(this, transpiledStyleSheetElement, referenceNode);

          // record refNo thus we can keep order while remounting
          if (typeof refNo === 'number' && refNo !== -1) {
            defineNonEnumerableProperty(transpiledStyleSheetElement, styleElementRefNodeNo, refNo);
          }
          const { dynamicStyleSheetElements } = sandboxConfig;
          // record dynamic style elements after insert succeed
          dynamicStyleSheetElements.push(transpiledStyleSheetElement);

          return result as T;
        }

        case SCRIPT_TAG_NAME: {
          const scriptElement = element as HTMLScriptElement;
          const { sandbox, dynamicExternalSyncScriptElements, nodeTransformer, fetch } = sandboxConfig;

          const externalSyncMode = scriptElement.hasAttribute('src') && !scriptElement.hasAttribute('async');

          let transformerOpts: AssetsTranspilerOpts = {
            fetch,
            sandbox,
            rawNode: scriptElement,
          };

          let queueScript: (script: HTMLScriptElement) => void | undefined;
          if (externalSyncMode) {
            const { scriptDeferred, prevScriptDeferred, queue } = prepareScriptForQueue(
              dynamicExternalSyncScriptElements,
              scriptFetchedDeferredWeakMap,
            );
            transformerOpts = {
              ...transformerOpts,
              scriptTranspiledDeferred: scriptDeferred,
              prevScriptTranspiledDeferred: prevScriptDeferred,
            } as ScriptTranspilerOpts;
            queueScript = queue;
          }

          const transpiledScriptElement = nodeTransformer(scriptElement, location.href, transformerOpts);

          const result = appendChild.call(this, transpiledScriptElement, refChild) as T;

          if (externalSyncMode) {
            queueScript!(transpiledScriptElement);
          }

          return result;
        }

        default:
          break;
      }
    }

    return appendChild.call(this, element, refChild) as T;
  }

  appendChildInSandbox[overwrittenSymbol] = true;

  return appendChildInSandbox;
}

export function getNewRemoveChild(
  nativeFn: typeof HTMLElement.prototype.removeChild,
  containerConfigGetter: (element: HTMLElement) => SandboxConfig | undefined,
) {
  function removeChildInSandbox<T extends Node>(this: HTMLHeadElement | HTMLBodyElement, child: T): T {
    const removeChild = nativeFn;

    const childElement = child as unknown as HTMLElement;
    const { tagName } = childElement;
    const containerConfig = containerConfigGetter(childElement);

    if (!isHijackingTag(tagName) || !containerConfig) {
      return removeChild.call(this, childElement) as T;
    }

    try {
      const { dynamicStyleSheetElements } = containerConfig;

      switch (tagName) {
        case STYLE_TAG_NAME:
        case LINK_TAG_NAME: {
          // try to remove the dynamic style sheet
          const dynamicElementIndex = dynamicStyleSheetElements.indexOf(
            childElement as HTMLLinkElement | HTMLStyleElement,
          );
          if (dynamicElementIndex !== -1) {
            dynamicStyleSheetElements.splice(dynamicElementIndex, 1);
          }

          break;
        }

        default: {
          break;
        }
      }

      // container might have been removed while app unmounting if the removeChild action was async
      if (this.contains(childElement)) {
        return removeChild.call(this, childElement) as T;
      }
    } catch (e) {
      console.warn(e);
    }

    return removeChild.call(this, childElement) as T;
  }

  removeChildInSandbox[overwrittenSymbol] = true;
  return removeChildInSandbox;
}

export function rebuildCSSRules(
  styleSheetElements: HTMLStyleElement[],
  reAppendElement: (stylesheetElement: HTMLStyleElement) => Promise<boolean>,
): Array<Promise<void>> {
  return styleSheetElements.map(async (styleSheetElement) => {
    // re-append the dynamic stylesheet to sub-app container
    const appendSuccess = await reAppendElement(styleSheetElement);
    if (appendSuccess) {
      /*
      get the stored css rules from styled-components generated element, and the re-insert rules for them.
      note that we must do this after style element had been added to document, which stylesheet would be associated to the document automatically.
      check the spec https://www.w3.org/TR/cssom-1/#associated-css-style-sheet
       */
      if (styleSheetElement instanceof HTMLStyleElement && isStyledComponentsLike(styleSheetElement)) {
        const cssRules = getStyledElementCSSRules(styleSheetElement);
        if (cssRules) {
          // eslint-disable-next-line no-plusplus
          for (let i = 0; i < cssRules.length; i++) {
            const cssRule = cssRules[i];
            const cssStyleSheetElement = styleSheetElement.sheet as CSSStyleSheet;
            cssStyleSheetElement.insertRule(cssRule.cssText, cssStyleSheetElement.cssRules.length);
          }
        }
      }
    }
  });
}
