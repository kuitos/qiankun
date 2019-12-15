/**
 * @author Kuitos
 * @since 2019-10-21
 */
import { execScripts } from 'import-html-entry';
import { isFunction } from 'lodash';
import { checkActivityFunctions } from 'single-spa';
import { Freer } from '../interfaces';

const styledComponentSymbol = Symbol('styled-component');

declare global {
  interface HTMLStyleElement {
    // eslint-disable-next-line no-undef
    [styledComponentSymbol]?: CSSRuleList;
  }
}

const rawHtmlAppendChild = HTMLHeadElement.prototype.appendChild;

const SCRIPT_TAG_NAME = 'SCRIPT';
const LINK_TAG_NAME = 'LINK';
const STYLE_TAG_NAME = 'STYLE';

/**
 * check if a element is an styled-component
 * @param element
 * @see https://github.com/styled-components/styled-components/blob/master/packages/styled-components/src/constants.js#L4-L10
 */
function isStyledComponents(element: HTMLStyleElement) {
  return element.getAttributeNames().some(attr => attr.indexOf('data-styled') !== -1);
}

function getCachedRules(element: HTMLStyleElement) {
  return element[styledComponentSymbol];
}

function setCachedRules(element: HTMLStyleElement, cssRules: CSSRuleList) {
  Object.defineProperty(element, styledComponentSymbol, { value: cssRules, configurable: true, enumerable: false });
}

export default function hijack(appName: string, proxy: Window): Freer {
  const dynamicStyleSheetElements: Array<HTMLLinkElement | HTMLStyleElement> = [];

  HTMLHeadElement.prototype.appendChild = function appendChild<T extends Node>(this: any, newChild: T) {
    const element = newChild as any;
    if (element.tagName) {
      switch (element.tagName) {
        case LINK_TAG_NAME:
        case STYLE_TAG_NAME: {
          const stylesheetElement = (newChild as any) as HTMLLinkElement | HTMLStyleElement;

          // check if the currently specified application is active
          // While we switch page from qiankun app to a normal react routing page, the normal one may load stylesheet dynamically while page rendering,
          // but the url change listener must to wait until the current call stack is flushed.
          // This scenario may cause we record the stylesheet from react routing page dynamic injection,
          // and remove them after the url change triggered and qiankun app is unmouting
          // see https://github.com/ReactTraining/history/blob/master/modules/createHashHistory.js#L222-L230
          const activated = checkActivityFunctions(window.location).some(name => name === appName);
          // only hijack dynamic style injection when app activated
          if (activated) {
            dynamicStyleSheetElements.push(stylesheetElement as HTMLStyleElement);
          }

          break;
        }

        case SCRIPT_TAG_NAME: {
          const { src, text } = element as HTMLScriptElement;

          if (src) {
            execScripts(null, [src], proxy).then(
              () => {
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
              },
              () => {
                const errorEvent = new CustomEvent('error');
                if (isFunction(element.onerror)) {
                  element.onerror(errorEvent);
                } else {
                  element.dispatchEvent(errorEvent);
                }
              },
            );

            const dynamicScriptCommentElement = document.createComment(`dynamic script ${src} replaced by qiankun`);
            return rawHtmlAppendChild.call(this, dynamicScriptCommentElement) as T;
          }

          execScripts(null, [`<script>${text}</script>`], proxy).then(element.onload, element.onerror);
          const dynamicInlineScriptCommentElement = document.createComment('dynamic inline script replaced by qiankun');
          return rawHtmlAppendChild.call(this, dynamicInlineScriptCommentElement) as T;
        }

        default:
          break;
      }
    }

    return rawHtmlAppendChild.call(this, element) as T;
  };

  return function free() {
    HTMLHeadElement.prototype.appendChild = rawHtmlAppendChild;
    dynamicStyleSheetElements.forEach(stylesheetElement => {
      // the dynamic injected stylesheet may had been removed by itself while unmounting
      if (document.head.contains(stylesheetElement)) {
        /*
         with a styled-components generated style element, we need to record its cssRules for restore next re-mounting time.
         We're doing this because the sheet of style element is going to be cleaned automatically by browser after the style element dom removed from document.
         see https://www.w3.org/TR/cssom-1/#associated-css-style-sheet
         */
        if (isStyledComponents(stylesheetElement)) {
          if (stylesheetElement.sheet) {
            // record the original css rules of the style element for restore
            setCachedRules(stylesheetElement, (stylesheetElement.sheet as CSSStyleSheet).cssRules);
          }
        }

        document.head.removeChild(stylesheetElement);
      }
    });

    return function rebuild() {
      dynamicStyleSheetElements.forEach(stylesheetElement => {
        document.head.appendChild(stylesheetElement);

        /*
        get the stored css rules from styled-components generated element, and the re-insert rules for them.
        note that we must do this after style element had been added to document, which stylesheet would be associated to the document automatically.
        check the spec https://www.w3.org/TR/cssom-1/#associated-css-style-sheet
         */
        if (isStyledComponents(stylesheetElement)) {
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
    };
  };
}
