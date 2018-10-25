import { uiModules } from 'ui/modules';
import { assign } from 'lodash';


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
      //IMPORTANT COPY THE OBJECT
      tableGroups = angular.extend(esResponse);

      // Check if exist
      if (tableGroups.tables.length === 0) {
        $scope.hasSomeRows = false;
        return;
      }

      if (!tableGroups.tables[0].rows_default) {
        tableGroups.tables[0].rows_default = tableGroups.tables[0].rows;
      }
      //////////////////////////
      if (!inputSearch) {
        $scope.config.searchKeyword = inputSearch = '';
      }
      //Logic to search
      var newrows = [];
      
      for (var i = 0; i < tableGroups.tables[0].rows_default.length; i++) {
        const row = tableGroups.tables[0].rows_default[i];

        for (var j = 0; j < row.length; j++) {
          const cell = row[j];

          const agg = cell.aggConfig;
          const key = cell.key;

          const field = agg.getField();

          // Polyfill for lodash@v4.x
          // @see https://github.com/lodash/lodash/blob/4.17.10/lodash.js#L11972
          const isKeyNull = key == null;

          if (!isKeyNull) {
            /**
             * Since the user will be searching for what they *see*, not the
             * raw data returned by ES, we have to format the key before
             * comparing it to the query.
             */
            let formattedKey = `${key}`.toLowerCase();

            if(field && field.type == 'date') {
              const formatter = agg.fieldFormatter('text');
              formattedKey = formatter(key);
            }

            if (formattedKey.includes(inputSearch.toLowerCase())) {
              newrows.push(row);
              break;
            }
          }
        }
      }

      tableGroups.tables[0].rows = newrows;
      /////

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
