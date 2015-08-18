phosphor-signaling
==================

A module for type-safe inter-object communication.

[API Docs](http://phosphorjs.github.io/phosphor-signaling/)


Package Install
---------------

**Prerequisites**
- [node](http://nodejs.org/)

```bash
npm install --save phosphor-signaling
```


Source Build
------------

**Prerequisites**
- [git](http://git-scm.com/)
- [node](http://nodejs.org/)

```bash
git clone https://github.com/phosphorjs/phosphor-signaling.git
cd phosphor-signaling
npm install
```

**Rebuild**
```bash
npm run clean
npm run build
```


Run Tests
---------

Follow the source build instructions first.

```bash
npm test
```


Build Docs
----------

Follow the source build instructions first.

```bash
npm run docs
```

Navigate to `docs/index.html`.


Supported Runtimes
------------------

The runtime versions which are currently *known to work* are listed below.
Earlier versions may also work, but come with no guarantees.

- Node 0.12.7+
- IE 11+
- Firefox 32+
- Chrome 38+


Usage Examples
--------------

**Note:** Except where explicitly noted in the examples, this module is fully
compatible with Node/Babel/ES6/ES5. Simply omit the type declarations when
using a language other than TypeScript.

**Start by defining the model object and its signals:**

```typescript
import { ISignal, defineSignal } from 'phosphor-signaling';


class Model {

  // See below for Node/Babel/ES6/ES5 equivalent
  @defineSignal
  itemAdded: ISignal<{ index: number, item: string }>;

  constructor(name) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  get items(): string[] {
    return this._items.slice();
  }

  addItem(item: string): void {
    var i = this._items.length;
    this._items.push(item);
    this.itemAdded.emit({ index: i, item: item });
  }

  private _name: string;
  private _items: string[] = [];
}

// Node/Babel/ES6/ES5 `@defineSignal` decorator alternative
defineSignal(Model.prototype, 'itemAdded');
```

**Next, define the handler(s) which will consume the signals:**

If the same handler is connected to multiple signals, it may want to get a
reference to the object emitting the signal which caused it to be invoked.
This can be done with the `emitter()` function.

```typescript
import { emitter } from 'phosphor-signaling';


function logger(args: { index: number, item: name }): void {
  var model = <Model>emitter();
  console.log(model.name, args.index, args.name);
}


class ItemCounter {

  constructor(model: Model, item: string) {
    this._model = model;
    this._item = item;
    model.itemAdded.connect(this._onItemAdded, this);
  }

  dispose(): void {
    this._model.itemAdded.disconnect(this._onItemAdded, this);
    this._model = null;
  }

  get count(): number {
    return this._count;
  }

  private _onItemAdded(args: { index: number, item: name }): void {
    if (args.item === this._item) this._count++;
  }

  private _model: Model;
  private _name: string;
  private _count = 0;
}
```

**Next, connect the handlers to the signals:**

```typescript
var m1 = new Model('foo');
var m2 = new Model('bar');
var m3 = new Model('baz');

var c1 = new ItemCounter(m1, 'quail');
var c2 = new ItemCounter(m1, 'robbin');
var c3 = new ItemCounter(m1, 'chicken');

m1.itemAdded.connect(logger);
m2.itemAdded.connect(logger);
m3.itemAdded.connect(logger);
```

**Make some changes to the models:**

```typescript
m1.addItem('turkey');
m1.addItem('fowl');
m1.addItem('quail');

m2.addItem('buzzard');

m3.addItem('hen');
```

**Disconnect the logger from all models in a single-shot:**

```typescript
import { disconnectReceiver } from 'phosphor-signaling';


disconnectReceiver(logger);
```

**Disconnect a particular model from all handlers in a single-shot:**

```typescript
import { disconnectEmitter } from 'phosphor-signaling';


disconnectEmitter(m1);
```

**Clear all signal data associated with an object:**

```typescript
import { clearSignalData } from 'phosphor-signaling';


// disconnect everything - emitter *and* receiver
clearSignalData(m1);
```
