import angular from 'angular';
import _ from 'lodash';

angular
  .module('kd.bundle.angular.queue')
  .controller('QueueSummaryController', QueueSummaryController);

/* @ngInject */
function QueueSummaryController(item, subtasks, notes, relatedItems, queueDiscussionServer, AssignmentService, Bundle, Toast, $scope, $state, $timeout, $http) {
  var vm = this;
  var layout = $scope.layout;
  var details = $scope.details;

  // MEMBERS
  vm.item = item;
  vm.notes = notes;
  vm.relatedItems = relatedItems;
  vm.isAssigningTeam = false;
  vm.isAssigningMember = false;
  vm.isLoading = false;
  vm.isStartingDiscussion = false;
  vm.membersForTeam = [];
  vm.subtasks = subtasks;
  vm.showNotes = false;
  vm.discussionServer = queueDiscussionServer;
  vm.embedBase = Bundle.spaceLocation();

  // METHODS
  vm.grabIt = grabIt;
  vm.startMemberAssignment = startMemberAssignment;
  vm.stopMemberAssignment = stopMemberAssignment;
  vm.memberSelected = memberSelected;
  vm.startTeamAssignment = startTeamAssignment;
  vm.stopTeamAssignment = stopTeamAssignment;
  vm.teamSelected = teamSelected;

  vm.startNewDiscussion = startNewDiscussion;

  vm.inWorkOrReview = inWorkOrReview;
  vm.inSubtask = inSubtask;

  vm.toggleNotes = toggleNotes;

  vm.showQueueIcon = showQueueIcon;
  vm.showRequestIcon = showRequestIcon;
  vm.originLink = originLink;

  activate();

  function activate() {}

  function startNewDiscussion() {
    vm.isStartingDiscussion = true;

    $http({
      url: queueDiscussionServer + '/api/v1/issues',
      method: 'POST',
      data: {
        name: vm.item.label,
        description: vm.item.label,
        tag_list: ['META:TYPE:Queue Task', 'META:ID:'+vm.item.id].join(',')
      }
    }).then(
      function success(discussion) {
        var update = { values: {} };
        var originalCoreState = vm.item.coreState;
        update.values['Discussion Id'] = discussion.data.guid;

        // Save.
        vm.item.customPUT(update).then(
          function success() {
            Toast.success('Started new discussion!');
            $state.go('queue.by.details.discuss', {}, {reload: true});
          },
          function error() {
            Toast.error('Failed to update item with discussion.');
          }
        );
      },
      function error() {
        Toast.error('Failed to start Discussion. Contact your system administrator.');
      }
    );
  }

  function startMemberAssignment() {
    if(vm.isAssigningTeam) return;
    if(_.isEmpty(AssignmentService.withoutRoot(vm.item.values['Assigned Team']))) {
      vm.startTeamAssignment();
      return;
    }

    AssignmentService.getMembers(vm.item.values['Assigned Team']).then(
      function success(members) {
        vm.membersForTeam = members;
        vm.membersForTeam.unshift({username: '', displayName: 'Unassigned'});
        vm.isAssigningMember = true;

        $timeout(function() {
          document.getElementById('member-selector').focus();
        }, 100);
      },
      function failure() {
        Toast.error('There was a problem retrieving members for the current team!');
      });
  }

  function stopMemberAssignment() {
    vm.isAssigningMember = false;
  }


  function memberSelected(member) {
    var update = { values: {} };
    vm.isLoading = true;
    update.values['Assigned Individual'] = member.username;
    update.values['Assigned Individual Display Name'] = member.displayName;

    vm.item.customPUT(update).then(
      function success() {
        Toast.success('Changed assigned individual!');
        vm.isLoading = false;
        vm.isAssigningMember = false;
        $state.go('queue.by.details.summary', {}, {reload:true});
      });
  }

  function startTeamAssignment() {
    if(vm.isAssigningMember) return;

    AssignmentService.getAllTeams().then(
      function success(teams) {
        vm.isAssigningTeam = true;
        var validTeams = _.filter(teams, function(team) {
          // Find the Assignable attribute.
          var assignable = _.find(team.attributes, function(attribute) {
            return attribute.name === 'Assignable';
          });

          // Check the Assignable attribute - teams are only assignable if they are explicitly set
          // to TRUE or YES. Otherwise it is assumed they are unassignable.
          var isValid = false;
          if(!_.isEmpty(assignable) && ['YES', 'TRUE'].indexOf(assignable.values[0].toUpperCase()) !== -1) {
            isValid = true;
          }

          return isValid;
        });
        vm.allTeams = _.map(validTeams, function(team) {
          var teamName = AssignmentService.withoutRoot(team.name);
          return { label: teamName, team: teamName };
        });

        // Focus on the team selector.
        $timeout(function() {
          document.getElementById('team-selector').focus();
        }, 100);
      },
      function failure() {
        Toast.error('Failed to retrieve team information - assignment disabled.');
      });
  }

  function stopTeamAssignment() {
    vm.isAssigningTeam = false;
  }

  function teamSelected(team) {
    var update = { values: {} };
    vm.isLoading = true;

    update.values['Assigned Team'] = AssignmentService.withRoot(team.team);
    update.values['Assigned Individual'] = '';
    update.values['Assigned Individual Display Name'] = '';

    vm.item.customPUT(update).then(
      function success() {
        Toast.success('Changed assigned team!');
        vm.isLoading = false;
        vm.isAssigningTeam = false;
        $state.go('queue.by.details.summary', {}, {reload:true});
      },
      function failure() {
        Toast.error('There was a problem reassigning the team!');
        $state.go('.', {}, {reload:true});
      });
  }

  function grabIt($event) {
    var grabItLocation = '.';
    if($event.shiftKey) {
      grabItLocation = 'queue.by.details.summary.work';
    }

    AssignmentService.grabIt(layout.currentUser.username, item.values['Assigned Team'], item).then(
      function() {
        Toast.success('Grabbed item.');
        $state.go(grabItLocation, {}, {reload:true});
      },
      function(error) {
        // Display the error information to the user.
        Toast.error(error);
        // And then start team assignment.
        vm.startTeamAssignment();
      }
    );
  }

  function inWorkOrReview() {
    return $state.current.name === 'queue.by.details.summary.work';
  }

  function inSubtask() {
    return $state.current.name === 'queue.by.details.summary.task';
  }

  function toggleNotes() {
    vm.showNotes = !vm.showNotes;
  }

  function showQueueIcon() {
    // If the parent isn't null, and there is an origin and the parent is not the same as the origin.
    if(vm.item.origin !== null && vm.item.origin.form.kapp.slug !== Bundle.kappSlug()) {
      return vm.item.parent !== null && vm.item.origin.id !== vm.item.parent.id;
    }
    return vm.item.parent !== null;
  };

  function showRequestIcon() {
    // if the origin isn't null and the parent is the same.
    if(vm.item.origin !== null && vm.item.origin.form.kapp.slug !== Bundle.kappSlug()) {
      return vm.item.parent !== null && vm.item.origin.id === vm.item.parent.id;
    }
    return false;
  };

  function originLink() {
    return Bundle.spaceLocation() + '/submissions/' + vm.item.origin.id + '?review';
  };
}
