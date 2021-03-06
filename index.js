'use strict';

//status is to allow workers to expose their important states to master, and possibly let monitor app show them clearly in its views

var util = require('util'),
	when = require('when'),
	timeout = require('when/timeout'),
	cluster = require('cluster'),
	_ = require('underscore');

var emitter = require('cluster-emitter'),
	noop = function noop(){

	},
	logger = function logger(){
		
		if(!_.isFunction(process.getLogger)){
            return {
                'info': _.bind(console.log, console),
                'debug': _.bind(console.log, console)
            };
        }

        return process.getLogger(__filename);
	};

//there must not be more than one status module in a process runtime, otherwise the status registered could be missing
module.exports = process.clusterStatus = process.clusterStatus || (function(emitter){

	var registry = {}; //map of registered status names to status entities 
        //(each entity is a struct {'pid':null, 'view':null, 'update':null}

	emitter.on('new-status', function(name, pid, view, update){

		registry[name] = registry[name] || [];

		if(_.some(registry[name], function(r){ //avoid duplicate component registry
				return r.pid === pid;
			})){

			logger().info('[status] register status ignored due to existing registry');
		}
		else{
            
			registry[name].push({
				'pid': pid,
				'view': view,
				'update': update
			});

			logger().info('[status] register status: %s from %d, in process: %d', name, pid, process.pid);
		}

		emitter.to([pid]).emit('status-registered', name);
	});

	emitter.on('del-status', function(name, pid){

		registry[name] = _.filter(registry[name], function(r){
			return r.pid !== pid;
		});
        
        if(!registry[name].length){
            delete registry[name];
        }

		logger().info('[status] unregister status: %s in process: %d', name, pid);

		emitter.to([pid]).emit('status-unregistered', name);
	});

	cluster.on('disconnect', function(worker){

		var pid = worker.process.pid;

		_.each(registry, function(arr, name){

			registry[name] = _.filter(arr, function(r){
				return r.pid !== pid;
			});
            
            if(!registry[name].length){
                delete registry[name];
            }
		});

		logger().debug('[status] auto updated after worker:%j got disconnected', registry);
	});

	return {

		'register': function register(name, view, update){

			var tillRegistered = when.defer();

			emitter.on('status-registered', function onRegistered(registered){
				if(name === registered){
					
					tillRegistered.resolve(registered);
					emitter.removeListener('status-registered', onRegistered);
				}
			});

			emitter.to(['master', 'self']).emit('new-status', name, process.pid, view, update);

			emitter.on(util.format('get-status-%s', name), function(echo){

				emitter.to(['master', 'self']).emit(echo, view());
			});

			emitter.on(util.format('set-status-%s', name), function(value, echo){

				update = update || noop;//in case update wasn't given

				emitter.to(['master', 'self']).emit(echo, update(value));
			});

			return tillRegistered.promise;
		},

		'unregister': function unregister(name){

			var tillUnregistered = when.defer();

			emitter.on('status-unregistered', function onUnregistered(unregistered){

				if(name === unregistered){

					tillUnregistered.resolve(unregistered);
					emitter.removeListener('status-unregistered', onUnregistered);
				}
			});

			emitter.to(['master', 'self']).emit('del-status', name, process.pid);

			emitter.removeAllListeners(util.format('get-status-%s', name));

			emitter.removeAllListeners(util.format('set-status-%s', name));

			return tillUnregistered.promise;
		},

		'statuses': function(){

			return _.keys(registry);
		},

		'getStatus': function getStatus(name, wait){

			return when.map(registry[name], function(r){

					var tillGet = when.defer(),
						echo = util.format('get-status-%s-%d-%d', name, r.pid, Date.now());

					emitter.once(echo, function(status){

                        tillGet.resolve({
							'pid': r.pid,
							'name': name,
							'status': status
						});
					});

					emitter.to([r.pid]).emit(util.format('get-status-%s', name), echo);

					return timeout(tillGet.promise, wait || 1000);
				});
		},

		'setStatus': function setStatus(name, value, wait){

			return when.map(registry[name], function(r){

					var tillSet = when.defer(),
						echo = util.format('set-status-%s-%d-%d', name, r.pid, Date.now());

					emitter.once(echo, function(status){
                        tillSet.resolve({
							'pid': r.pid,
							'name': name,
							'status': status
						});
					});

					emitter.to([r.pid]).emit(util.format('set-status-%s', name), value, echo);

					return timeout(tillSet.promise, wait || 1000);
				});
		}
	};
})(emitter);
