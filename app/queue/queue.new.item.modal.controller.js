import angular from 'angular';

angular
  .module('kd.bundle.angular.queue')
  .controller('QueueNewItemModalController', QueueNewItemModalController);

/* @ngInject */
function QueueNewItemModalController(activeTeam, formsForTeam, user, Bundle, Toast, $window, $timeout, $state, $uibModalInstance, $compile, $scope, $document) {
  var vm = this;

  vm.activeTeam = activeTeam;
  vm.filteredForms = formsForTeam;
  vm.formLoaded = false;
  vm.loadedForm = null;

  vm.close = function() {
    if(vm.loadedForm !== null) {
      vm.loadedForm.close();
    }
    $uibModalInstance.dismiss();
  };

  vm.loadForm = function(form) {
    var formPath = Bundle.kappLocation() + '/' + form.slug;
    if(['Available', 'Mine', 'All', '__show__'].indexOf(vm.activeTeam) === -1) {
      formPath += '?values[Assigned%20Team]='+encodeURIComponent(vm.activeTeam);
    }
    var K = $window.K;

    var responseHandler = function(data, actions) {
      var itemId = data.submission.id;
      var assignedIndividual = data.submission.values['Assigned Individual'];

      $timeout(function() {
        Toast.success('Started new work item.');
        if(assignedIndividual === user.username) {
          $state.go('queue.by.details.summary.work', {itemId: itemId, filterName: vm.activeTeam});
        } else {
          $state.go('queue.by.details.summary', {itemId: itemId, filterName: vm.activeTeam});
        }
        actions.close();
        $uibModalInstance.dismiss();
      });
    };

    K.load({
      container: '#formContainer',
      path: formPath,
      loaded: function(form) {
        vm.loadedForm = form;

        var footerSection = angular.element(form.find('section[data-element-name=Footer]')[0]);
        footerSection.detach();

        var modalFooter = angular.element(document.querySelector('.modal-footer'));
        modalFooter.empty();
        modalFooter.append(footerSection);

        // We need to compile the loaded form.
        var element = angular.element($document[0].querySelector('#formContainer'));
        $compile(element)($scope);

        $timeout(function() { vm.formLoaded = true; });
      },
      created: responseHandler,
      updated: responseHandler
    });
  };
}
