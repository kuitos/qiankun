---
nav:
  title: API
  order: 1
toc: menu
---

# API 说明

## 基于路由配置

适用于 route-based 场景。

通过将微应用关联到一些 url 规则的方式，实现当浏览器 url 发生变化时，自动加载相应的微应用的功能。

### registerMicroApps(apps, lifeCycles?)

- 参数

  - apps - `Array<RegistrableApp>` - 必选，微应用的一些注册信息
  - lifeCycles - `LifeCycles` - 可选，全局的微应用生命周期钩子

- 类型

  - `RegistrableApp`

    - name - `string` - 必选，微应用的名称，微应用之间必须确保唯一。

    - entry - `string | { scripts?: string[]; styles?: string[]; html?: string }` - 必选，微应用的入口。
      - 配置为字符串时，表示微应用的访问地址，例如 `https://qiankun.umijs.org/guide/`。
      - 配置为对象时，`html` 的值是微应用的 html 内容字符串，而不是微应用的访问地址。微应用的 `publicPath` 将会被设置为 `/`。
    - container - `string | HTMLElement` - 必选，微应用的容器节点的选择器或者 Element 实例。如`container: '#root'` 或 `container: document.querySelector('#root')`。

    - activeRule - `string | (location: Location) => boolean | Array<string | (location: Location) => boolean> ` - 必选，微应用的激活规则。

      - 支持直接配置字符串或字符串数组，如 `activeRule: '/app1'` 或 `activeRule: ['/app1', '/app2']`，当配置为字符串时会直接跟 url 中的路径部分做前缀匹配，匹配成功表明当前应用会被激活。
      - 支持配置一个 active function 函数或一组 active function。函数会传入当前 location 作为参数，函数返回 true 时表明当前微应用会被激活。如 `location => location.pathname.startsWith('/app1')`。

      规则示例：

      `'/app1'`

      - ✅ https://app.com/app1

      - ✅ https://app.com/app1/anything/everything

      - 🚫 https://app.com/app2

      `'/users/:userId/profile'`

      - ✅ https://app.com/users/123/profile
      - ✅ https://app.com/users/123/profile/sub-profile/
      - 🚫 https://app.com/users//profile/sub-profile/
      - 🚫 https://app.com/users/profile/sub-profile/

      `'/pathname/#/hash'`

      - ✅ https://app.com/pathname/#/hash
      - ✅ https://app.com/pathname/#/hash/route/nested
      - 🚫 https://app.com/pathname#/hash/route/nested
      - 🚫 https://app.com/pathname#/another-hash

      `['/pathname/#/hash', '/app1']`

      - ✅ https://app.com/pathname/#/hash/route/nested
      - ✅ https://app.com/app1/anything/everything
      - 🚫 https://app.com/pathname/app1
      - 🚫 https://app.com/app2

      浏览器 url 发生变化会调用 activeRule 里的规则，`activeRule` 任意一个返回 `true` 时表明该微应用需要被激活。

    - loader - `(loading: boolean) => void` - 可选，loading 状态发生变化时会调用的方法。

    - props - `object` - 可选，主应用需要传递给微应用的数据。

  - `LifeCycles`

    ```ts
    type Lifecycle = (app: RegistrableApp) => Promise<any>;
    ```

    - beforeLoad - `Lifecycle | Array<Lifecycle>` - 可选
    - beforeMount - `Lifecycle | Array<Lifecycle>` - 可选
    - afterMount - `Lifecycle | Array<Lifecycle>` - 可选
    - beforeUnmount - `Lifecycle | Array<Lifecycle>` - 可选
    - afterUnmount - `Lifecycle | Array<Lifecycle>` - 可选

- 用法

  注册微应用的基础配置信息。当浏览器 url 发生变化时，会自动检查每一个微应用注册的 `activeRule` 规则，符合规则的应用将会被自动激活。

- 示例

  ```tsx
  import { registerMicroApps } from 'qiankun';

  registerMicroApps(
    [
      {
        name: 'app1',
        entry: '//localhost:8080',
        container: '#container',
        activeRule: '/react',
        props: {
          name: 'kuitos',
        },
      },
    ],
    {
      beforeLoad: (app) => console.log('before load', app.name),
      beforeMount: [(app) => console.log('before mount', app.name)],
    },
  );
  ```

### `start(opts?)`

- 参数

  - opts - `Options` 可选

- 类型

  - `Options`

    - prefetch - `boolean | 'all' | string[] | (( apps: RegistrableApp[] ) => { criticalAppNames: string[]; minorAppsName: string[] })` - 可选，是否开启预加载，默认为 `true`。

      配置为 `true` 则会在第一个微应用 mount 完成后开始预加载其他微应用的静态资源

      配置为 `'all'` 则主应用 `start` 后即开始预加载所有微应用静态资源

      配置为 `string[]` 则会在第一个微应用 mounted 后开始加载数组内的微应用资源

      配置为 `function` 则可完全自定义应用的资源加载时机 (首屏应用及次屏应用)

    - sandbox - `boolean` | `{ strictStyleIsolation?: boolean, experimentalStyleIsolation?: boolean }` - 可选，是否开启沙箱，默认为 `true`。

      默认情况下沙箱可以确保单实例场景子应用之间的样式隔离，但是无法确保主应用跟子应用、或者多实例场景的子应用样式隔离。当配置为 `{ strictStyleIsolation: true }` 时表示开启严格的样式隔离模式。这种模式下 qiankun 会为每个微应用的容器包裹上一个 [shadow dom](https://developer.mozilla.org/zh-CN/docs/Web/Web_Components/Using_shadow_DOM) 节点，从而确保微应用的样式不会对全局造成影响。

      :::warning
      基于 ShadowDOM 的严格样式隔离并不是一个可以无脑使用的方案，大部分情况下都需要接入应用做一些适配后才能正常在 ShadowDOM 中运行起来（比如 react 场景下需要解决这些 <a target="_blank" href="https://github.com/facebook/react/issues/10422">问题</a>，使用者需要清楚开启了 <code>strictStyleIsolation</code> 意味着什么。后续 qiankun 会提供更多官方实践文档帮助用户能快速的将应用改造成可以运行在 ShadowDOM 环境的微应用。
      :::

      除此以外，qiankun 还提供了一个实验性的样式隔离特性，当 experimentalStyleIsolation 被设置为 true 时，qiankun 会改写子应用所添加的样式为所有样式规则增加一个特殊的选择器规则来限定其影响范围，因此改写后的代码会表达类似为如下结构：

      ```javascript
      // 假设应用名是 react16
      .app-main {
        font-size: 14px;
      }

      div[data-qiankun-react16] .app-main {
        font-size: 14px;
      }
      ```

      注意: @keyframes, @font-face, @import, @page 将不被支持 (i.e. 不会被改写)

    - singular - `boolean | ((app: RegistrableApp<any>) => Promise<boolean>);` - 可选，是否为单实例场景，单实例指的是同一时间只会渲染一个微应用。默认为 `true`。

    - fetch - `Function` - 可选，自定义的 fetch 方法。

    - getPublicPath - `(entry: Entry) => string` - 可选，参数是微应用的 entry 值。

    - getTemplate - `(tpl: string) => string` - 可选。

    - excludeAssetFilter - `(assetUrl: string) => boolean` - 可选，指定部分特殊的动态加载的微应用资源（css/js) 不被 qiankun 劫持处理。

- 用法

  启动 qiankun。

- 示例

  ```ts
  import { start } from 'qiankun';

  start();
  ```

### setDefaultMountApp(appLink)

- 参数

  - appLink - `string` - 必选

- 用法

  设置主应用启动后默认进入的微应用。

- 示例

  ```ts
  import { setDefaultMountApp } from 'qiankun';

  setDefaultMountApp('/homeApp');
  ```

### `runAfterFirstMounted(effect)`

- 参数

  - effect - `() => void` - 必选

- 用法

  第一个微应用 mount 后需要调用的方法，比如开启一些监控或者埋点脚本。

- 示例

  ```ts
  import { runAfterFirstMounted } from 'qiankun';

  runAfterFirstMounted(() => startMonitor());
  ```

## 手动加载微应用

适用于需要手动 加载/卸载 一个微应用的场景。

:::info
通常这种场景下微应用是一个不带路由的可独立运行的业务组件。
微应用不宜拆分过细，建议按照业务域来做拆分。业务关联紧密的功能单元应该做成一个微应用，反之关联不紧密的可以考虑拆分成多个微应用。
一个判断业务关联是否紧密的标准：<strong>看这个微应用与其他微应用是否有频繁的通信需求</strong>。如果有可能说明这两个微应用本身就是服务于同一个业务场景，合并成一个微应用可能会更合适。
:::

### `loadMicroApp(app, configuration?)`

- 参数

  - app - `LoadableApp` - 必选，微应用的基础信息

    - name - `string` - 必选，微应用的名称，微应用之间必须确保唯一。
    - entry - `string | { scripts?: string[]; styles?: string[]; html?: string }` - 必选，微应用的入口（详细说明同上）。
    - container - `string | HTMLElement` - 必选，微应用的容器节点的选择器或者 Element 实例。如`container: '#root'` 或 `container: document.querySelector('#root')`。
    - props - `object` - 可选，初始化时需要传递给微应用的数据。

  - configuration - `Configuration` - 可选，微应用的配置信息

    - sandbox - `boolean` | `{ strictStyleIsolation?: boolean, experimentalStyleIsolation?: boolean }` - 可选，是否开启沙箱，默认为 `true`。

      默认情况下沙箱可以确保单实例场景子应用之间的样式隔离，但是无法确保主应用跟子应用、或者多实例场景的子应用样式隔离。当配置为 `{ strictStyleIsolation: true }` 时表示开启严格的样式隔离模式。这种模式下 qiankun 会为每个微应用的容器包裹上一个 [shadow dom](https://developer.mozilla.org/zh-CN/docs/Web/Web_Components/Using_shadow_DOM) 节点，从而确保微应用的样式不会对全局造成影响。

      :::warning
      基于 ShadowDOM 的严格样式隔离并不是一个可以无脑使用的方案，大部分情况下都需要接入应用做一些适配后才能正常在 ShadowDOM 中运行起来（比如 react 场景下需要解决这些 <a target="_blank" href="https://github.com/facebook/react/issues/10422">问题</a>，使用者需要清楚开启了 <code>strictStyleIsolation</code> 意味着什么。后续 qiankun 会提供更多官方实践文档帮助用户能快速的将应用改造成可以运行在 ShadowDOM 环境的微应用。
      :::

      除此以外，qiankun 还提供了一个实验性的样式隔离特性，当 experimentalStyleIsolation 被设置为 true 时，qiankun 会改写子应用所添加的样式为所有样式规则增加一个特殊的选择器规则来限定其影响范围，因此改写后的代码会表达类似为如下结构：

      ```css
      // 假设应用名是 react16
      .app-main {
        font-size: 14px;
      }

      div[data-qiankun-react16] .app-main {
        font-size: 14px;
      }
      ```

      注意事项: 目前 @keyframes, @font-face, @import, @page 等规则不会支持 (i.e. 不会被改写)

    - singular - `boolean | ((app: RegistrableApp<any>) => Promise<boolean>);` - 可选，是否为单实例场景，单实例指的是同一时间只会渲染一个微应用。默认为 `false`。

    - fetch - `Function` - 可选，自定义的 fetch 方法。

    - getPublicPath - `(entry: Entry) => string` - 可选，参数是微应用的 entry 值。

    - getTemplate - `(tpl: string) => string` - 可选

    - excludeAssetFilter - `(assetUrl: string) => boolean` - 可选，指定部分特殊的动态加载的微应用资源（css/js) 不被 qiankun 劫持处理

- 返回值 - `MicroApp` - 微应用实例

  - mount(): Promise&lt;null&gt;;
  - unmount(): Promise&lt;null&gt;;
  - update(customProps: object): Promise&lt;any&gt;;
  - getStatus(): | "NOT_LOADED" | "LOADING_SOURCE_CODE" | "NOT_BOOTSTRAPPED" | "BOOTSTRAPPING" | "NOT_MOUNTED" | "MOUNTING" | "MOUNTED" | "UPDATING" | "UNMOUNTING" | "UNLOADING" | "SKIP_BECAUSE_BROKEN" | "LOAD_ERROR";
  - loadPromise: Promise&lt;null&gt;;
  - bootstrapPromise: Promise&lt;null&gt;;
  - mountPromise: Promise&lt;null&gt;;
  - unmountPromise: Promise&lt;null&gt;;

- 用法

  手动加载一个微应用。

  如果需要能支持主应用手动 update 微应用，需要微应用 entry 再多导出一个 update 钩子：

  ```ts
  export async function mount(props) {
    renderApp(props);
  }

  // 增加 update 钩子以便主应用手动更新微应用
  export async function update(props) {
    renderPatch(props);
  }
  ```

- 示例

  ```jsx
  import { loadMicroApp } from 'qiankun';
  import React from 'react';

  class App extends React.Component {
    containerRef = React.createRef();
    microApp = null;

    componentDidMount() {
      this.microApp = loadMicroApp({
        name: 'app1',
        entry: '//localhost:1234',
        container: this.containerRef.current,
        props: { brand: 'qiankun' },
      });
    }

    componentWillUnmount() {
      this.microApp.unmount();
    }

    componentDidUpdate() {
      this.microApp.update({ name: 'kuitos' });
    }

    render() {
      return <div ref={this.containerRef}></div>;
    }
  }
  ```

### `prefetchApps(apps, importEntryOpts?)`

- 参数

  - apps - `AppMetadata[]` - 必选 - 预加载的应用列表
  - importEntryOpts - 可选 - 加载配置

- 类型

  - `AppMetadata`
    - name - `string` - 必选 - 应用名
    - entry - `string | { scripts?: string[]; styles?: string[]; html?: string }` - 必选，微应用的 entry 地址

- 用法

  手动预加载指定的微应用静态资源。仅手动加载微应用场景需要，基于路由自动激活场景直接配置 `prefetch` 属性即可。

- 示例

  ```ts
  import { prefetchApps } from 'qiankun';

  prefetchApps([
    { name: 'app1', entry: '//localhost:7001' },
    { name: 'app2', entry: '//localhost:7002' },
  ]);
  ```

## 组件加载微应用
### React 项目
#### 安装

```bash
npm i @qiankun
npm i @qiankunjs/react
```

#### MicroApp 组件

直接通过 `<MicroApp />` 组件加载（或卸载）子应用，该组件提供了 loading 以及错误捕获相关的能力：

```tsx
import { MicroApp } from '@qiankunjs/react';

export default function Page() {
  return <MicroApp name="app1" entry="http://localhost:8000" />;
}
```

当启用子应用加载动画或错误捕获能力时，子应用接受一个额外的样式类 `wrapperClassName`，渲染的结果如下所示：

```tsx
<div style={{ position: 'relative' }} className={wrapperClassName}>
  <MicroAppLoader loading={loading} />
  <ErrorBoundary error={e} />
  <MicroApp className={className} />
</div>
```

#### 加载动画

启用此能力后，当子应用正在加载时，会自动显示加载动画。当子应用挂载完成变成 `MOUNTED` 状态时，加载状态结束，显示子应用内容。

直接将 `autoSetLoading` 作为参数传入即可：

```tsx
import { MicroApp } from '@qiankunjs/react';

export default function Page() {
  return <MicroApp name="app1" entry="http://localhost:8000" autoSetLoading />;
}
```

#### 自定义加载动画

如果您希望覆盖默认的加载动画样式时，可以设置一个自定义的加载组件 `loader` 作为子应用的加载动画。

```tsx
import CustomLoader from '@/components/CustomLoader';
import { MicroApp } from '@qiankunjs/react';

export default function Page() {
  return (
    <MicroApp name="app1" entry="http://localhost:8000" loader={(loading) => <CustomLoader loading={loading} />} />
  );
}
```

其中，`loading` 为 `boolean` 类型参数，为 `true` 时表示仍在加载状态，为 `false` 时表示加载状态已结束。

#### 错误捕获

启用此能力后，当子应用加载出现异常时，会自动显示错误信息。可以向子应用传入 `autoCaptureError` 属性以开启子应用错误捕获能力：

```tsx
import { MicroApp } from '@qiankunjs/react';

export default function Page() {
  return <MicroApp name="app1" entry="http://localhost:8000" autoCaptureError />;
}
```

#### 自定义错误捕获

如果您希望覆盖默认的错误捕获组件样式时，可以设置一个自定义的组件 `errorBoundary` 作为子应用的错误捕获组件：

```tsx
import CustomErrorBoundary from '@/components/CustomErrorBoundary';
import { MicroApp } from '@qiankunjs/react';

export default function Page() {
  return (
    <MicroApp
      name="app1"
      entry="http://localhost:8000"
      errorBoundary={(error) => <CustomErrorBoundary error={error} />}
    />
  );
}
```

#### 组件属性

| 属性 | 必填 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- | --- |
| `name` | 是 | 微应用的名称 | `string` |
| `entry` | 是 | 微应用的 HTML 地址 | `string` |
| `autoSetLoading` | 否 | 自动设置微应用的加载状态 | `boolean` | `false` |
| `loader` | 否 | 自定义的微应用加载状态组件 | `(loading) => React.ReactNode` | `undefined` |
| `autoCaptureError` | 否 | 自动设置微应用的错误捕获 | `boolean` | `false` |
| `errorBoundary` | 否 | 自定义的微应用错误捕获组件 | `(error: any) => React.ReactNode` | `undefined` |
| `className` | 否 | 微应用的样式类 | `string` | `undefined` |
| `wrapperClassName` | 否 | 包裹微应用加载组件、错误捕获组件和微应用的样式类，仅在启用加载组件或错误捕获组件时有效 | `string` | `undefined` |

#### 获取子应用加载状态

加载状态包括："NOT_LOADED" | "LOADING_SOURCE_CODE" | "NOT_BOOTSTRAPPED" | "BOOTSTRAPPING" | "NOT_MOUNTED" | "MOUNTING" | "MOUNTED" | "UPDATING" | "UNMOUNTING" | "UNLOADING" |

```tsx
import { useRef } from 'react';
import { MicroApp } from '@qiankunjs/react';

export default function Page() {
  const microAppRef = useRef();

  useEffect(() => {
    // 获取子应用加载状态
    console.log(microAppRef.current?.getStatus());
  }, []);

  return <MicroApp name="app1" entry="http://localhost:8000" ref={microAppRef} />;
}
```

### Vue 项目
#### 安装

```bash
npm i @qiankun
npm i @qiankunjs/vue
```

#### MicroApp 组件

直接通过 `<MicroApp />` 组件加载（或卸载）子应用，该组件提供了 loading 以及错误捕获相关的能力：

```vue
<script setup>
import { MicroApp } from '@qiankunjs/vue';
</script>

<template>
  <micro-app name="app1" entry="http://localhost:8000" />
</template>
```


当启用子应用加载动画或错误捕获能力时，子应用接受一个额外的样式类 wrapperClassName，渲染的结果如下所示：

```vue
<div :class="wrapperClassName">
  <MicroAppLoader :loading="loading" />
  <ErrorBoundary :error="e" />
  <MicroApp :class="className" />
</div>
```

#### 加载动画

启用此能力后，当子应用正在加载时，会自动显示加载动画。当子应用挂载完成变成 MOUNTED 状态时，加载状态结束，显示子应用内容。

直接将 autoSetLoading 作为参数传入即可：

```vue
<script setup>
import { MicroApp } from '@qiankunjs/vue';
</script>

<template>
  <micro-app name="app1" entry="http://localhost:8000" autoSetLoading />
</template>
```

#### 自定义加载动画

如果您希望覆盖默认的加载动画样式时，可以通过 loader slot 来自定义加载组件 loader 作为子应用的加载动画。

```vue
<script setup>
import CustomLoader from '@/components/CustomLoader.vue';
import { MicroApp } from '@qiankunjs/vue';
</script>

<template>
  <micro-app name="app1" entry="http://localhost:8000" >
     <template #loader="{ loading }">
       <custom-loader :loading="loading">
     </template>
  </micro-app>
</template>
```

其中，loading 为 boolean 类型参数，为 true 时表示仍在加载状态，为 false 时表示加载状态已结束。

#### 错误捕获

启用此能力后，当子应用加载出现异常时，会自动显示错误信息。可以向子应用传入 autoCaptureError 属性以开启子应用错误捕获能力：

```vue
<script setup>
import { MicroApp } from '@qiankunjs/vue';
</script>

<template>
  <micro-app name="app1" entry="http://localhost:8000" autoCaptureError />
</template>
```

#### 自定义错误捕获

如果您希望覆盖默认的错误捕获组件样式时，可以通过 errorBoundary slot 来自定义子应用的错误捕获组件：

```vue
<script setup>
import CustomErrorBoundary from '@/components/CustomErrorBoundary.vue';
import { MicroApp } from '@qiankunjs/vue';
</script>

<template>
  <micro-app name="app1" entry="http://localhost:8000" >
     <template #error-boundary="{ error }">
       <custom-error-boundary :error="error">
     </template>
  </micro-app>
</template>
```

#### 组件属性

| 属性 | 必填 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- | --- |
| `name` | 是 | 微应用的名称 | `string` |
| `entry` | 是 | 微应用的 HTML 地址 | `string` |
| `autoSetLoading` | 否 | 自动设置微应用的加载状态 | `boolean` | `false` |
| `autoCaptureError` | 否 | 自动设置微应用的错误捕获 | `boolean` | `false` |
| `className` | 否 | 微应用的样式类 | `string` | `undefined` |
| `wrapperClassName` | 否 | 包裹微应用加载组件、错误捕获组件和微应用的样式类，仅在启用加载组件或错误捕获组件时有效 | `string` | `undefined` |

#### 组件插槽

| 插槽            | 说明         |
| --------------- | ------------ |
| `loader`        | 加载状态插槽 |
| `errorBoundary` | 错误捕获插槽 |


## [addErrorHandler/removeErrorHandler](https://single-spa.js.org/docs/api#adderrorhandler)

## `addGlobalUncaughtErrorHandler(handler)`

- 参数

  - handler - `(...args: any[]) => void` - 必选

- 用法

  添加全局的未捕获异常处理器。

- 示例

  ```ts
  import { addGlobalUncaughtErrorHandler } from 'qiankun';

  addGlobalUncaughtErrorHandler((event) => console.log(event));
  ```

## `removeGlobalUncaughtErrorHandler(handler)`

- 参数

  - handler - `(...args: any[]) => void` - 必选

- 用法

  移除全局的未捕获异常处理器。

- 示例

  ```ts
  import { removeGlobalUncaughtErrorHandler } from 'qiankun';

  removeGlobalUncaughtErrorHandler(handler);
  ```

## `initGlobalState(state)`

- 参数

  - state - `Record<string, any>` - 必选

- 用法

  定义全局状态，并返回通信方法，建议在主应用使用，微应用通过 props 获取通信方法。

- 返回

  - MicroAppStateActions

    - onGlobalStateChange: `(callback: OnGlobalStateChangeCallback, fireImmediately?: boolean) => void`， 在当前应用监听全局状态，有变更触发 callback，fireImmediately = true 立即触发 callback

    - setGlobalState: `(state: Record<string, any>) => boolean`， 按一级属性设置全局状态，微应用中只能修改已存在的一级属性

    - offGlobalStateChange: `() => boolean`，移除当前应用的状态监听，微应用 umount 时会默认调用

- 示例

  主应用：

  ```ts
  import { initGlobalState, MicroAppStateActions } from 'qiankun';

  // 初始化 state
  const actions: MicroAppStateActions = initGlobalState(state);

  actions.onGlobalStateChange((state, prev) => {
    // state: 变更后的状态; prev 变更前的状态
    console.log(state, prev);
  });
  actions.setGlobalState(state);
  actions.offGlobalStateChange();
  ```

  微应用：

  ```ts
  // 从生命周期 mount 中获取通信方法，使用方式和 master 一致
  export function mount(props) {
    props.onGlobalStateChange((state, prev) => {
      // state: 变更后的状态; prev 变更前的状态
      console.log(state, prev);
    });

    props.setGlobalState(state);
  }
  ```
