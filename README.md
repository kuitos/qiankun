# qiankun（乾坤）
> In Chinese traditional culture `qian` means heaven and `kun` stands for earth, so `qiankun` is the universe.

An implementation of [Micro Frontends](https://micro-frontends.org/), based on [single-spa](https://github.com/CanopyTax/single-spa), but made it production-ready.

## Usage

```shell
npm i qiankun -S
```

## Examples

```shell
cd examples/main && npm i && npm start
cd examples/react && npm i && npm start
cd examples/vue && npm i && npm start
```

Visit `http://localhost:7099`

![](./examples/example.gif)

```js
import { registerMicroApps, start } from 'qiankun';

registerMicroApps(
  [
    { name: 'react app', entry: '//localhost:7100', routerPrefix: '/react' },
    { name: 'vue app', entry: { scripts: [ '//localhost:7100/main.js' ] }, routerPrefix: '/vue' },
  ],
  {
    renderFunction({ appContent, loading }) {
      const container = document.getElementById('container');
      ReactDOM.render(<Framework loading={loading} content={appContent}/>, container);
    },
    activeRule(app) {
      return location.pathname.startsWith(app.routerPrefix);
    },
  });

start({ prefetch: true, jsSandbox: true });
```

## Features

- [x] HTML Entry
- [x] Config Entry
- [x] Isolated styles
- [x] JS Sandbox
- [x] assets prefetch
- [ ] [umi-plugin-single-spa](https://github.com/umijs/umi-plugin-single-spa) integration

## API

### registerMicroApps

```typescript
function registerMicroApps(apps: RegistrableApp[], options: Options): void
```
