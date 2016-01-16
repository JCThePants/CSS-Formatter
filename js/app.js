define(['rawUI', 'css-format'], function () {

    var app = angular.module('app', ['rawUI', 'css-format']);

    /*
     * CONTROLLER
     */
    app.controller('CSSFormatterCtrl', ['$scope', '$timeout', 'CSSParser', 'CSSFormatter', 'CSSTableOfContents', 'ruiUtils',
        function ($scope, $timeout, CSSParser, CSSFormatter, CSSTableOfContents, utils) {

            var inputTimeout,
                updateTimeout;

            // state variables
            var state = $scope.s = {
                input: '',
                output: '',
                parser: null,
                format: 'expanded',
                isUpdating: false,
                msg: {
                    copy: null,
                    parseError: null
                }
            };

            $scope.css = {
                indent: 4,
                tableOfContents: true,
                tocIndent: false,
                comments: {
                    render: true
                }
            };

            $scope.formats = {
                'expanded': {
                    indent: 4
                },
                'nested': {
                    selectors : {
                        linesBefore: 1,
                        linesBeforeComment: 0,
                        nestedIndent: 4
                    },
                    braces: {
                        closeNewLine: false,
                        closeIndent: 1
                    }
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
                        closeIndent: 0
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

            $scope.$watch('css', function () {
                updateOutput();
            }, true);

            $scope.$watch('s.input', function (val) {
                if (!val)
                    return;

                if (inputTimeout)
                    clearTimeout(inputTimeout);

                if (updateTimeout)
                    clearTimeout(updateTimeout);

                inputTimeout = setTimeout(function () {
                    try {
                        state.parser = new CSSParser(val);
                        updateOutput();
                        $scope.s.msg.parseError = null;
                    }
                    catch (e) {
                        $scope.s.msg.parseError = e;
                        console.log(e);
                    }
                    utils.triggerUpdate();
                }, 100);
            });

            $scope.$watch('s.format', function () {
                angular.merge($scope.css, CSSFormatter.defaultOptions());
                var typeOptions = angular.copy($scope.formats[state.format]);
                angular.merge($scope.css, typeOptions);
                updateOutput();
            });

            function updateOutput() {
                if (!state.parser)
                    return;

                if (updateTimeout)
                    clearTimeout(updateTimeout);

                // timeout prevents excessive updating
                updateTimeout = setTimeout(function () {

                    try {
                        var typeOptions = angular.copy($scope.formats[state.format]),
                            options = angular.merge(typeOptions, $scope.css);

                        if (options.tableOfContents) {
                            state.output = new CSSTableOfContents(state.parser, options).getLines();
                        }
                        else {
                            state.output = new CSSFormatter(state.parser, options).getLines();
                        }

                        $scope.s.msg.parseError = null;
                    }
                    catch (e) {
                        $scope.s.msg.parseError = e;
                        console.log(e);
                    }
                    utils.triggerUpdate();

                }, 10);
            }
        }]);

    return app;

});