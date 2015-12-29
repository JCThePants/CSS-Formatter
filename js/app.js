define(['rawUI', 'css-format'], function () {

    var app = angular.module('app', ['rawUI', 'css-format']);

    /*
     * CONTROLLER
     */
    app.controller('CSSFormatterCtrl', ['$scope', '$timeout', 'CSSParser', 'CSSFormatter', 'CSSTableOfContents', function ($scope, $timeout, CSSParser, CSSFormatter, CSSTableOfContents) {

        

        // state variables
        var state = $scope.s = {
            msg: {
                copy: null
            }
        };
        
        $scope.input = '';
        $scope.output = '';
        $scope.parser = null;
        $scope.format = 'expanded';

        $scope.css = {
            indent: 4,
            tableOfContents: true,
            tocIndent: true,
            comments: {
                render: true
            }
        };

        $scope.formats = {
            'expanded': {
                indent: 4
            },
            'compacted': {
                braces: {
                    openNewLine: false, // if true, the opening brace is placed on a new line,
                    openIndent: 1,
                    openIndentAfter: 1,
                    closeNewLine: false, // if true, the closing brace is placed on a new line
                    closeIndent: 0,
                    closeIndentAfter: 0
                },
                property: {
                    newLine: false,
                    indentAfter: 1
                }
            },
            'compressed': {
                indent: 0,
                selectors: {
                    newLine: false,
                    linesBefore: 0,
                    linesBeforeComment: 0,
                    maxLength: 0,
                    forcePerLine: false,
                    combinatedPerLine: false,
                    multispace: 0
                },
                braces: {
                    openNewLine: false,
                    openIndent: 0,
                    openIndentAfter: 0,
                    closeNewLine: false,
                    closeIndent: 0,
                    openIndentAfter: 0,
                },
                property: {
                    newLine: false,
                    spaceBetween: 0,
                    closeLast: false
                },
                comments: {
                    render: false,
                    renderProperty: false,
                    renderPropertyInline: false,
                    linesBefore: 0,
                    linesAfter: 0
                }
            }
        };

        // invoke to display "copy to clipboard confirmation"
        $scope.confirmCopy = function (isSuccess) {
            state.msg.copy = {
                isSuccess: isSuccess
            };
            $timeout(function () {});
            $timeout(function () {
                state.msg.copy = null;
            }, 4000);
        };

        var updateOutput = (function () {
            
            var updateInProgress;

            return function () {
                if (!$scope.parser)
                    return;
                
                if (updateInProgress)
                    $timeout.cancel(updateInProgress);

                updateInProgress = $timeout(function () {
                    updateInProgress = false;

                    var typeOptions = angular.copy($scope.formats[$scope.format]);
                    var options = angular.merge(typeOptions, $scope.css);

                    if (options.tableOfContents) {
                        $scope.output = new CSSTableOfContents($scope.parser, options).getLines();
                    }
                    else {
                        $scope.output = new CSSFormatter($scope.parser, options).getLines();
                    }

                }, 500);
            }

        }());
        
        $scope.$watch('css', function () {
            updateOutput();
        }, true);
        
        $scope.$watch('input', function (val) {
            if (!val)
                return;
            $scope.parser = new CSSParser(val);
            updateOutput();
        });
        
        $scope.$watch('format', function (val) {
            angular.merge($scope.css, CSSFormatter.defaultOptions());    
            var typeOptions = angular.copy($scope.formats[$scope.format]);
            angular.merge($scope.css, typeOptions);
            updateOutput();
        });
        
    }]);

    return app;

});