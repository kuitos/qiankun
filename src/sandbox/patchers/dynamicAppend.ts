/**
 * @author Kuitos
 * @since 2019-10-21
 */
import { execScripts } from 'import-html-entry';
import { isFunction, noop } from 'lodash';
import { checkActivityFunctions } from 'single-spa';
import { frameworkConfiguration } from '../../apis';
import { Freer } from '../../interfaces';
import { attachDocProxySymbol } from '../common';
import * as css from './css';

const styledComponentSymbol = Symbol('styled-component-qiankun');
const attachElementContainerSymbol = Symbol('attach-proxy-container');

declare global {
  interface HTMLStyleElement {
    // eslint-disable-next-line no-undef
    [styledComponentSymbol]?: CSSRuleList;
  }
}

const rawHeadAppendChild = HTMLHeadElement.prototype.appendChild;
const rawHeadRemoveChild = HTMLHeadElement.prototype.removeChild;
const rawBodyAppendChild = HTMLBodyElement.prototype.appendChild;
const rawBodyRemoveChild = HTMLBodyElement.prototype.removeChild;
const rawHeadInsertBefore = HTMLHeadElement.prototype.insertBefore;
const rawRemoveChild = HTMLElement.prototype.removeChild;

const rawDocumentCreateElement = Document.prototype.createElement;

const SCRIPT_TAG_NAME = 'SCRIPT';
const LINK_TAG_NAME = 'LINK';
const STYLE_TAG_NAME = 'STYLE';

const proxyContainerInfoMapper = new Map<WindowProxy, Record<string, any>>();

function isHijackingTag(tagName?: string) {
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
function isStyledComponentsLike(element: HTMLStyleElement) {
  return !element.textContent && ((element.sheet as CSSStyleSheet)?.cssRules.length || getCachedRules(element)?.length);
}

function getCachedRules(element: HTMLStyleElement) {
  return element[styledComponentSymbol];
}

function setCachedRules(element: HTMLStyleElement, cssRules: CSSRuleList) {
  Object.defineProperty(element, styledComponentSymbol, { value: cssRules, configurable: true, enumerable: false });
}

function getOverwrittenAppendChildOrInsertBefore(opts: {
  appName: string;
  proxy: WindowProxy;
  singular: boolean;
  dynamicStyleSheetElements: HTMLStyleElement[];
  appWrapperGetter: CallableFunction;
  rawDOMAppendOrInsertBefore: <T extends Node>(newChild: T, refChild?: Node | null) => T;
  scopedCSS: boolean;
  excludeAssetFilter?: CallableFunction;
}) {
  return function appendChildOrInsertBefore<T extends Node>(
    this: HTMLHeadElement | HTMLBodyElement,
    newChild: T,
    refChild?: Node | null,
  ) {
    let element = newChild as any;
    const { rawDOMAppendOrInsertBefore } = opts;
    if (element.tagName) {
      // eslint-disable-next-line prefer-const
      let { appName, appWrapperGetter, proxy, singular, dynamicStyleSheetElements } = opts;
      const { scopedCSS, excludeAssetFilter } = opts;

      const storedContainerInfo = element[attachElementContainerSymbol];
      if (storedContainerInfo) {
        // eslint-disable-next-line prefer-destructuring
        appName = storedContainerInfo.appName;
        // eslint-disable-next-line prefer-destructuring
        singular = storedContainerInfo.singular;
        // eslint-disable-next-line prefer-destructuring
        appWrapperGetter = storedContainerInfo.appWrapperGetter;
        // eslint-disable-next-line prefer-destructuring
        dynamicStyleSheetElements = storedContainerInfo.dynamicStyleSheetElements;
        // eslint-disable-next-line prefer-destructuring
        proxy = storedContainerInfo.proxy;
      }

      const invokedByMicroApp = singular
        ? // check if the currently specified application is active
          // While we switch page from qiankun app to a normal react routing page, the normal one may load stylesheet dynamically while page rendering,
          // but the url change listener must to wait until the current call stack is flushed.
          // This scenario may cause we record the stylesheet from react routing page dynamic injection,
          // and remove them after the url change triggered and qiankun app is unmouting
          // see https://github.com/ReactTraining/history/blob/master/modules/createHashHistory.js#L222-L230
          checkActivityFunctions(window.location).some(name => name === appName)
        : // have storedContainerInfo means it invoked by a micro app in multiply mode
          !!storedContainerInfo;

      switch (element.tagName) {
        case LINK_TAG_NAME:
        case STYLE_TAG_NAME: {
          const stylesheetElement: HTMLLinkElement | HTMLStyleElement = newChild as any;
          if (!invokedByMicroApp) {
            return rawDOMAppendOrInsertBefore.call(this, element, refChild) as T;
          }

          const mountDOM = appWrapperGetter();
          const { href } = stylesheetElement as HTMLLinkElement;
          if (excludeAssetFilter && href && excludeAssetFilter(href)) {
            return rawDOMAppendOrInsertBefore.call(mountDOM, element, refChild) as T;
          }

          if (scopedCSS) {
            css.process(mountDOM, stylesheetElement, appName);
          }

          // eslint-disable-next-line no-shadow
          dynamicStyleSheetElements.push(stylesheetElement);
          const referenceNode = mountDOM.contains(refChild) ? refChild : null;
          return rawDOMAppendOrInsertBefore.call(mountDOM, stylesheetElement, referenceNode);
        }

        case SCRIPT_TAG_NAME: {
          if (!invokedByMicroApp) {
            return rawDOMAppendOrInsertBefore.call(this, element, refChild) as T;
          }

          const mountDOM = appWrapperGetter();
          const { src, text } = element as HTMLScriptElement;

          // some script like jsonp maybe not support cors which should't use execScripts
          if (excludeAssetFilter && src && excludeAssetFilter(src)) {
            return rawDOMAppendOrInsertBefore.call(mountDOM, element, refChild) as T;
          }

          const { fetch } = frameworkConfiguration;
          const referenceNode = mountDOM.contains(refChild) ? refChild : null;

          if (src) {
            execScripts(null, [src], proxy, {
              fetch,
              strictGlobal: !singular,
              beforeExec: () => {
                Object.defineProperty(document, 'currentScript', {
                  get(): any {
                    return element;
                  },
                  configurable: true,
                });
              },
              success: () => {
                // we need to invoke the onload event manually to notify the event listener that the script was completed
                // here are the two typical ways of dynamic script loading
                // 1. element.onload callback way, which webpack and loadjs used, see https://github.com/muicss/loadjs/blob/master/src/loadjs.js#L138
                // 2. addEventListener way, which toast-loader used, see https://github.com/pyrsmk/toast/blob/master/src/Toast.ts#L64
                const loadEvent = new CustomEvent('load');
                if (isFunction(element.onload)) {
                  element.onload(loadEvent);
                } else {
                  element.dispatchEvent(loadEvent);
                }

                // eslint-disable-next-line no-const-assign
                element = null;
              },
              error: () => {
                const errorEvent = new CustomEvent('error');
                if (isFunction(element.onerror)) {
                  element.onerror(errorEvent);
                } else {
                  element.dispatchEvent(errorEvent);
                }

                // eslint-disable-next-line no-const-assign
                element = null;
              },
            });

            const dynamicScriptCommentElement = document.createComment(`dynamic script ${src} replaced by qiankun`);
            return rawDOMAppendOrInsertBefore.call(mountDOM, dynamicScriptCommentElement, referenceNode);
          }

          execScripts(null, [`<script>${text}</script>`], proxy, {
            strictGlobal: !singular,
            success: element.onload,
            error: element.onerror,
          });
          const dynamicInlineScriptCommentElement = document.createComment('dynamic inline script replaced by qiankun');
          return rawDOMAppendOrInsertBefore.call(mountDOM, dynamicInlineScriptCommentElement, referenceNode);
        }

        default:
          break;
      }
    }

    return rawDOMAppendOrInsertBefore.call(this, element, refChild);
  };
}

function getNewRemoveChild(opts: {
  appWrapperGetter: CallableFunction;
  headOrBodyRemoveChild: typeof HTMLElement.prototype.removeChild;
}) {
  return function removeChild<T extends Node>(this: HTMLHeadElement | HTMLBodyElement, child: T) {
    const { headOrBodyRemoveChild } = opts;
    try {
      const { tagName } = child as any;
      if (isHijackingTag(tagName)) {
        let { appWrapperGetter } = opts;

        const storedContainerInfo = (child as any)[attachElementContainerSymbol];
        if (storedContainerInfo) {
          // eslint-disable-next-line prefer-destructuring
          appWrapperGetter = storedContainerInfo.appWrapperGetter;
        }

        // container may had been removed while app unmounting if the removeChild action was async
        const container = appWrapperGetter();
        if (container.contains(child)) {
          return rawRemoveChild.call(container, child) as T;
        }
      }
    } catch (e) {
      console.warn(e);
    }

    return headOrBodyRemoveChild.call(this, child) as T;
  };
}

function patchHTMLDynamicAppendPrototypeFunctions(
  appName: string,
  appWrapperGetter: () => HTMLElement | ShadowRoot,
  proxy: Window,
  singular = true,
  scopedCSS = false,
  dynamicStyleSheetElements: HTMLStyleElement[],
  excludeAssetFilter?: CallableFunction,
) {
  // Just overwrite it while it have not been overwrite
  if (
    HTMLHeadElement.prototype.appendChild === rawHeadAppendChild &&
    HTMLBodyElement.prototype.appendChild === rawBodyAppendChild &&
    HTMLHeadElement.prototype.insertBefore === rawHeadInsertBefore
  ) {
    HTMLHeadElement.prototype.appendChild = getOverwrittenAppendChildOrInsertBefore({
      rawDOMAppendOrInsertBefore: rawHeadAppendChild,
      appName,
      appWrapperGetter,
      proxy,
      singular,
      dynamicStyleSheetElements,
      scopedCSS,
      excludeAssetFilter,
    }) as typeof rawHeadAppendChild;
    HTMLBodyElement.prototype.appendChild = getOverwrittenAppendChildOrInsertBefore({
      rawDOMAppendOrInsertBefore: rawBodyAppendChild,
      appName,
      appWrapperGetter,
      proxy,
      singular,
      dynamicStyleSheetElements,
      scopedCSS,
      excludeAssetFilter,
    }) as typeof rawBodyAppendChild;

    HTMLHeadElement.prototype.insertBefore = getOverwrittenAppendChildOrInsertBefore({
      rawDOMAppendOrInsertBefore: rawHeadInsertBefore as any,
      appName,
      appWrapperGetter,
      proxy,
      singular,
      dynamicStyleSheetElements,
      scopedCSS,
      excludeAssetFilter,
    }) as typeof rawHeadInsertBefore;
  }

  // Just overwrite it while it have not been overwrite
  if (
    HTMLHeadElement.prototype.removeChild === rawHeadRemoveChild &&
    HTMLBodyElement.prototype.removeChild === rawBodyRemoveChild
  ) {
    HTMLHeadElement.prototype.removeChild = getNewRemoveChild({
      appWrapperGetter,
      headOrBodyRemoveChild: rawHeadRemoveChild,
    });
    HTMLBodyElement.prototype.removeChild = getNewRemoveChild({
      appWrapperGetter,
      headOrBodyRemoveChild: rawBodyRemoveChild,
    });
  }

  return function unpatch(recoverPrototype: boolean) {
    if (recoverPrototype) {
      HTMLHeadElement.prototype.appendChild = rawHeadAppendChild;
      HTMLHeadElement.prototype.removeChild = rawHeadRemoveChild;
      HTMLBodyElement.prototype.appendChild = rawBodyAppendChild;
      HTMLBodyElement.prototype.removeChild = rawBodyRemoveChild;

      HTMLHeadElement.prototype.insertBefore = rawHeadInsertBefore;
    }
  };
}

function patchDocumentCreateElement(
  appName: string,
  appWrapperGetter: () => HTMLElement | ShadowRoot,
  singular: boolean,
  proxy: Window,
  dynamicStyleSheetElements: HTMLStyleElement[],
) {
  if (singular) {
    return noop;
  }

  proxyContainerInfoMapper.set(proxy, { appName, proxy, appWrapperGetter, dynamicStyleSheetElements, singular });

  if (Document.prototype.createElement === rawDocumentCreateElement) {
    Document.prototype.createElement = function createElement<K extends keyof HTMLElementTagNameMap>(
      this: Document,
      tagName: K,
      options?: ElementCreationOptions,
    ): HTMLElement {
      const element = rawDocumentCreateElement.call(this, tagName, options);
      if (isHijackingTag(tagName)) {
        const proxyContainerInfo = proxyContainerInfoMapper.get(this[attachDocProxySymbol]);
        if (proxyContainerInfo) {
          Object.defineProperty(element, attachElementContainerSymbol, {
            value: proxyContainerInfo,
            enumerable: false,
          });
        }
      }

      return element;
    };
  }

  return function unpatch(recoverPrototype: boolean) {
    proxyContainerInfoMapper.delete(proxy);
    if (recoverPrototype) {
      Document.prototype.createElement = rawDocumentCreateElement;
    }
  };
}

let bootstrappingPatchCount = 0;
let mountingPatchCount = 0;

/**
 * Just hijack dynamic head append, that could avoid accidentally hijacking the insertion of elements except in head.
 * Such a case: ReactDOM.createPortal(<style>.test{color:blue}</style>, container),
 * this could made we append the style element into app wrapper but it will cause an error while the react portal unmounting, as ReactDOM could not find the style in body children list.
 * @param appName
 * @param appWrapperGetter
 * @param proxy
 * @param mounting
 * @param singular
 * @param scopedCSS
 * @param excludeAssetFilter
 */
export default function patch(
  appName: string,
  appWrapperGetter: () => HTMLElement | ShadowRoot,
  proxy: Window,
  mounting = true,
  singular = true,
  scopedCSS = false,
  excludeAssetFilter?: CallableFunction,
): Freer {
  let dynamicStyleSheetElements: Array<HTMLLinkElement | HTMLStyleElement> = [];

  const unpatchDocumentCreate = patchDocumentCreateElement(
    appName,
    appWrapperGetter,
    singular,
    proxy,
    dynamicStyleSheetElements,
  );

  const unpatchDynamicAppendPrototypeFunctions = patchHTMLDynamicAppendPrototypeFunctions(
    appName,
    appWrapperGetter,
    proxy,
    singular,
    scopedCSS,
    dynamicStyleSheetElements,
    excludeAssetFilter,
  );

  if (!mounting) bootstrappingPatchCount++;
  if (mounting) mountingPatchCount++;

  return function free() {
    // bootstrap patch just called once but its freer will be called multiple times
    if (!mounting && bootstrappingPatchCount !== 0) bootstrappingPatchCount--;
    if (mounting) mountingPatchCount--;

    const allMicroAppUnmounted = mountingPatchCount === 0 && bootstrappingPatchCount === 0;
    // release the overwrite prototype after all the micro apps unmounted
    unpatchDynamicAppendPrototypeFunctions(allMicroAppUnmounted);
    unpatchDocumentCreate(allMicroAppUnmounted);

    dynamicStyleSheetElements.forEach(stylesheetElement => {
      /*
         With a styled-components generated style element, we need to record its cssRules for restore next re-mounting time.
         We're doing this because the sheet of style element is going to be cleaned automatically by browser after the style element dom removed from document.
         see https://www.w3.org/TR/cssom-1/#associated-css-style-sheet
         */
      if (stylesheetElement instanceof HTMLStyleElement && isStyledComponentsLike(stylesheetElement)) {
        if (stylesheetElement.sheet) {
          // record the original css rules of the style element for restore
          setCachedRules(stylesheetElement, (stylesheetElement.sheet as CSSStyleSheet).cssRules);
        }
      }

      // As now the sub app content all wrapped with a special id container,
      // the dynamic style sheet would be removed automatically while unmoutting
    });

    return function rebuild() {
      dynamicStyleSheetElements.forEach(stylesheetElement => {
        // re-append the dynamic stylesheet to sub-app container
        // Using document.head.appendChild ensures that appendChild calls
        // can also directly use the HTMLHeadElement.prototype.appendChild method which is overwritten at mounting phase
        document.head.appendChild.call(appWrapperGetter(), stylesheetElement);

        /*
        get the stored css rules from styled-components generated element, and the re-insert rules for them.
        note that we must do this after style element had been added to document, which stylesheet would be associated to the document automatically.
        check the spec https://www.w3.org/TR/cssom-1/#associated-css-style-sheet
         */
        if (stylesheetElement instanceof HTMLStyleElement && isStyledComponentsLike(stylesheetElement)) {
          const cssRules = getCachedRules(stylesheetElement);
          if (cssRules) {
            // eslint-disable-next-line no-plusplus
            for (let i = 0; i < cssRules.length; i++) {
              const cssRule = cssRules[i];
              (stylesheetElement.sheet as CSSStyleSheet).insertRule(cssRule.cssText);
            }
          }
        }
      });

      // As the hijacker will be invoked every mounting phase, we could release the cache for gc after rebuilding
      if (mounting) {
        dynamicStyleSheetElements = [];
      }
    };
  };
}
