cluster-status
==============

A utility to collect status from all workers/master and present as an aggregated view.

This is a helpful piece evolved from the current cluster2, which is to allow applications to easily register status of any interest.
It allows each worker to register its own state, master would automatically aggregate all states from active workers.
It works nicely with our monitor capability (via debug middleware)

Notice, the status module works in a single process runtime too based on its event driven implementation.

* **`register`**

```javascript
require('cluster-status')
  .register('status-name',
    function(){
      return 'view';//view function
    },
    function(value){
      //update function
    });
```

* **`statuses`**

```javascript
require('cluster-status')
  .statuses(); //return names of registered statuses
```

* **`getStatus`**

```javascript
require('cluster-status')
  .getStatus('status-name')
  .then(function(status){
    //got status
  },
  function(error){
    //err
  });
```

* **`setStatus`**

```javascript
require('cluster-status')
  .setStatus('status-name',
    'value')
  .then(function(set){
    //set or not
  },
  function(error){
    //err
  });
```
