import { uiModules } from 'ui/modules';
import { assign } from 'lodash';
import { filterTableBySearch } from '../common/table_filter.js';


// get the kibana/kbn_searchtables module, and make sure that it requires the "kibana" module if it
// didn't already
const module = uiModules.get('kibana/kbn_searchtables', ['kibana']);

// add a controller to tha module, which will transform the esResponse into a
// tabular format that we can pass to the table directive
module.controller('KbnSearchTablesVisController', function ($timeout, $scope) {
  const uiStateSort = ($scope.uiState) ? $scope.uiState.get('vis.params.sort') : {};
  assign($scope.vis.params.sort, uiStateSort);

  const defaultConfig = {
    searchKeyword: ''
  };
  $scope.config = ($scope.uiState) ? $scope.uiState.get('vis.params.config') || defaultConfig : defaultConfig;

  $scope.sort = $scope.vis.params.sort;
  $scope.$watchCollection('sort', function (newSort) {
    $scope.uiState.set('vis.params.sort', newSort);
  });

  $scope.resetSearch = function () {
    $scope.config.searchKeyword = '';
  };

  /**
   * Recreate the entire table when:
   * - the underlying data changes (esResponse)
   * - one of the view options changes (vis.params)
   */
  $scope.$watchMulti(['esResponse', 'config.searchKeyword'], function ([esResponse, inputSearch]) {
    //VERY IMPORTANT IN ORDER TO RE-RENDER THE TABLE
    $scope.renderAgain = false;
    ////////////////////////////////////////////
    let tableGroups = $scope.tableGroups = null;
    let hasSomeRows = $scope.hasSomeRows = null;

    if (esResponse) {
      //IMPORTANT COPY THE OBJECT SO WE CAN CHANGE IT
      tableGroups = angular.extend(esResponse);

      // Check if exist
      if (tableGroups.tables.length === 0) {
        $scope.hasSomeRows = false;
        return;
      }

      //////////////////////////
      if (!inputSearch) {
        $scope.config.searchKeyword = inputSearch = '';
      }

      const aggs = $scope.visState.aggs;
      const aggsUsed = aggs.filter(agg => agg.enabled);
      const hasBuckets = aggsUsed.some(agg => agg.schema === 'bucket');
      const queryNotEmpty = inputSearch.length > 0;

      // We only filter the table when the user has entered at least
      // one search parameter (either by defining some buckets or using
      // the search bar). Otherwise, the user might be surprised by an
      // empty table when no buckets are defined and they haven't
      // searched for anything.
      if (hasBuckets || queryNotEmpty) {
        filterTableBySearch(tableGroups, inputSearch);
      }

      // Check if we have any rows left after filtering
      hasSomeRows = tableGroups.tables.some(function haveRows(table) {
        if (table.tables) return table.tables.some(haveRows);
        return table.rows.length > 0;
      });

      $scope.renderComplete();
    }

    $scope.hasSomeRows = hasSomeRows;
    if (hasSomeRows) {
      $scope.tableGroups = tableGroups;
      $timeout(function () {
        $scope.$apply();
        $scope.renderAgain = true;
      });
    }
  });

  $scope.$watch('config', function () {
    $scope.uiState.set('vis.params.config', $scope.config);
  }, true);
});
