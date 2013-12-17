cluster-status
==============

A utility to collect status from all workers/master and present as an aggregated view.

This is a helpful piece evolved from the current cluster2, which is to allow applications to easily register status of any interest.
It allows each worker to register its own state, master would automatically aggregate all states from active workers.
It works nicely with our monitor capability (via debug middleware)

* **`register`**

```javascript
require('cluster2/status')
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
require('cluster2/status')
  .statuses(); //return names of registered statuses
```

* **`getStatus`**

```javascript
require('cluster2/status')
  .getStatus('status-name')
  .then(function(status){
    //got status
  })
  .otherwise(function(error){
    //err
  });
```

* **`setStatus`**

```javascript
require('cluster2/status')
  .setStatus('status-name',
    'value')
  .then(function(set){
    //set or not
  })
  .otherwise(function(error){
    //err
  });
```
