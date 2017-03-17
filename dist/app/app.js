(function() {
  'use strict';

  var modules = [
    'kd.core',
    'kd.core.authentication',
    'kd.core.models',

    'kd.bundle.angular.common',

    'kd.bundle.angular.errors',

    'kd.bundle.angular.layout',
    'kd.bundle.angular.catalog',
    'kd.bundle.angular.queue',
    'kd.bundle.angular.queue.setup'
  ];

  if(bundle && bundle.config && bundle.config.queue && bundle.config.queue.response) {
    modules.push('kd.response');
  }
  angular.module('kd.bundle.angular', modules).run(["$rootScope", "$state", function($rootScope, $state) {
    $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
      if(error.status != 401) {
        $state.go('error.system');
      }
      console.log('failed to change state', arguments);
    });
  //
  //  $rootScope.$on('$stateChangeSuccess', function() {
  //    console.log('i did to change state')
  //  })
  //
  //  $rootScope.$on('$stateNotFound', function() {
  //    console.log('i did not to change state')
  //  })
  }]);

}());
