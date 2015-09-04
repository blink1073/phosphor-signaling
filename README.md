phosphor-signaling
==================

[![Build Status](https://travis-ci.org/phosphorjs/phosphor-signaling.svg)](https://travis-ci.org/phosphorjs/phosphor-signaling?branch=master)
[![Coverage Status](https://coveralls.io/repos/phosphorjs/phosphor-signaling/badge.svg?branch=master&service=github)](https://coveralls.io/github/phosphorjs/phosphor-signaling?branch=master)

A module for type-safe inter-object communication.

[API Docs](http://phosphorjs.github.io/phosphor-signaling/api/)


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


Bundle for the Browser
----------------------

Follow the package install instructions first.

```bash
npm install --save-dev browserify browserify-css
browserify myapp.js -t browserify-css -o mybundle.js
```


Usage Examples
--------------

**Note:** This module is fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.

```typescript
import {
  ISignal, Signal, clearSignalData, disconnectReceiver, disconnectSender
} from 'phosphor-signaling';


// Complex signal args can be defined with an interface.
interface IItemAddedArgs {
  index: number;
  item: string;
}


// A model class which emits a signal when an item is added.
class Model {

  // By convention, signals are declared statically.
  static itemAddedSignal = new Signal<Model, IItemAddedArgs>();

  constructor(name) {
    this._name = name;
  }

  // Expose the signal via a getter which binds to `this`.
  get itemAdded(): ISignal<Model, IItemAddedArgs> {
    return Model.itemAddedSignal.bind(this);
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

    // Emit the signal and invoke connected callbacks.
    this.itemAdded.emit({ index: i, item: item });
  }

  private _name: string;
  private _items: string[] = [];
}


// A free function used as a signal handler.
function logger(sender: Model, args: IItemAddedArgs): void {
  var model = <Model>emitter();
  console.log(model.name, args.index, args.name);
}


// A class which subcribes to signals on a model.
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

  private _onItemAdded(sender: Model, args: IItemAddedArgs): void {
    if (args.item === this._item) this._count++;
  }

  private _model: Model;
  private _name: string;
  private _count = 0;
}


// Create the models and connect the signal handlers.
var m1 = new Model('foo');
var m2 = new Model('bar');
var m3 = new Model('baz');

var c1 = new ItemCounter(m1, 'quail');
var c2 = new ItemCounter(m1, 'robbin');
var c3 = new ItemCounter(m1, 'chicken');

m1.itemAdded.connect(logger);
m2.itemAdded.connect(logger);
m3.itemAdded.connect(logger);


// Modify the models which will cause the signals to fire.
m1.addItem('turkey');
m1.addItem('fowl');
m1.addItem('quail');
m2.addItem('buzzard');
m3.addItem('hen');


// Disconnect the logger from all models in a single-shot.
disconnectReceiver(logger);


// Disconnect a particular model from all handlers in a single-shot.
disconnectSender(m1);


// disconnect everything - sender *and* receiver
clearSignalData(m1);
```
