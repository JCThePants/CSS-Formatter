/*
 * Licensed under the MIT License (MIT).
 * (http://opensource.org/licenses/MIT)
 * Copyright (c) JCThePants (github.com/JCThePants/rawUI)
 */

/* Included modules: general, required, controls, Popups, Select Control, Slider Control */

(function(window, document){
var module = angular.module('rawUI', []),
    ae = angular.element,
    defineProperty = Object.defineProperty;

function ruiDirectiveName(name) {
    return name;
}

function ruiServiceName(name) {
    // add rui prefix
    return 'rui' + name[0].toUpperCase() + name.substr(1);
}

function ruiFactoryName(name) {
    // add Rui prefix
    return 'Rui' + name;
}

function registerElement(name) {
    // try in case library is used in a context that does not allow registering elements.
    // i.e Google Chrome Extension
    try {
        document.registerElement && document.registerElement('slider-box');
    }
    catch (e) {
        // do nothing
    }
}



/* DIRECTIVE: (<A>) 
 *
 * Prevent clicks on disabled links and links with a hashtag href 
 */
module.directive('a', function () {
    
    /* return */
    return {
        restrict: 'E',
        link: aLink
    };

    /* link */
    function aLink($scope, $elem, $attrs) {
        $elem.on('click', function (e) {
            if ($elem.hasClass('disabled')) {
                e.stopImmediatePropagation();
                return false;
            } else if ($attrs['href'] === '#') {
                e.preventDefault();
            }
        });
    }
});


/* DIRECTIVE (<data-transition-height>) 
 *
 * Use to apply height based CSS transitions to an unknown/auto height.
 *
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-transitionHeight-%5BA%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('transitionHeight');

    module.directive(directiveName, TransitionHeightDirective);

    TransitionHeightDirective.$inject = ['$parse', ruiServiceName('utils')];

    /* directive */
    function TransitionHeightDirective($parse, utils) {

        /* return */
        return {
            restrict: 'A',
            scope: true,
            link: transitionHeightLink
        };

        /* link */
        function transitionHeightLink($scope, $elem, $attrs) {

            var attrVal = $attrs[directiveName];
            if (!attrVal) {
                console.warn('transitionHeight directive requires an expression to evaluate.');
                return;
            }

            var getter = $parse(attrVal),
                isOpen = false,
                rect = utils.rect,
                inProgress;

            // set height to auto if window is resized while open
            // to ensure element is properly resized.
            ae(window).on('resize', windowResize);

            // remove window event handle when element is removed
            $scope.$on('$destroy', function () {
                ae(window).off('resize', windowResize);
            });

            // watch for changes to scope value
            getter && $scope.$watch(function () {
                return getter($scope);
            }, function (val) {
                update(isOpen = val);
            });

            function windowResize() {
                isOpen && $elem.css('height', 'auto');
            }

            function update(open) {

                var height;

                if (inProgress)
                    return;

                inProgress = true;

                if (open) {

                    // set to auto so we can measure the required height
                    $elem.css('height', 'auto');

                    // get height
                    height = rect($elem).height;

                    // set back to 0
                    $elem.css('height', 0).addClass('opening');

                    setTimeout(function () {
                        $elem.addClass('open').css('height', height + 'px');
                    }, 1);
                } else {
                    height = rect($elem).height;
                    $elem.addClass('closing').removeClass('open').css('height', 0);
                }

                // wait for animations to stop
                var prevHeight = rect($elem).height,
                    interval = setInterval(function () {
                        if (height === 'auto' || prevHeight === rect($elem).height) {

                            clearInterval(interval);

                            setTimeout(function () {
                                $elem.removeClass('opening closing');
                                inProgress = false;

                                // make sure the curent model value matches the current state.
                                var current = getter($scope);
                                open !== current && update(current);
                            }, 10);
                        }

                        prevHeight = rect($elem).height;
                    }, 50)
            }
        }
    }
}());


/* DIRECTIVE: (data-enable)
 * 
 * Disables an element and descendant controls when the attributes value evaluates as false.
 *
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-enable-%5BA%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('enable');

    module.directive(directiveName, EnableDirective);

    EnableDirective.$inject = ['$parse', ruiServiceName('utils')];

    /* directive */
    function EnableDirective($parse, utils) {

        /* return */
        return {
            restrict: 'A',
            scope: false,
            link: enableLink
        };

        /* link */
        function enableLink($scope, $elem, $attrs) {

            var attrVal = $attrs[directiveName];
            if (!attrVal) {
                console.warn('enable directive requires an expression to evaluate.');
                return;
            }

            var getter = $parse(attrVal);

            $scope.$watch(function () {
                return getter($scope);
            }, function (isEnabled) {
                if (isEnabled) {
                    utils.disable($elem, false);
                } else {
                    utils.disable($elem, true);
                }
            });
        }
    }
}());


/* DIRECTIVE: (data-disable)
 * 
 * Disables an element and descendant controls when the attributes value evaluates as true.
 *
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-disable-%5BA%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('disable');

    module.directive(directiveName, DisableDirective);

    DisableDirective.$inject = ['$parse', ruiServiceName('utils')];

    /* disable */
    function DisableDirective($parse, utils) {

        /* return */
        return {
            restrict: 'A',
            scope: false,
            link: disableLink
        };

        /* link */
        function disableLink($scope, $elem, $attrs) {

            var attrVal = $attrs[directiveName];
            if (!attrVal) {
                console.warn('disable directive requires an attribute value to evaluate.');
                return;
            }

            var getter = $parse(attrVal);

            $scope.$watch(function () {
                return getter($scope);
            }, function (isDisabled) {
                if (isDisabled) {
                    utils.disable($elem, true);
                } else {
                    utils.disable($elem, false);
                }
            });
        }
    }
}());


/* DIRECTIVE: (data-and) 
 * 
 * Works in conjunction with (data-ng-model). Specifies a condition that must be true in order
 * for the model to be valid. 
 * 
 * The attributes value must evaluate true, otherwise the model value is set to false.
 */
(function () {

    var directiveName = ruiDirectiveName('and');

    module.directive(directiveName, AndDirective);

    AndDirective.$inject = ['$parse'];

    /* directive */
    function AndDirective($parse) {

        /* return */
        return {
            restrict: 'A',
            require: 'ngModel',
            scope: true,
            link: andLink
        };

        /* link */
        function andLink($scope, $elem, $attrs, ngModel) {

            var attrVal = $attrs[directiveName];
            if (!attrVal) {
                console.warn('and directive requires expression to evaluate.');
                return;
            }

            var getter = $parse(attrVal);

            // watch for changes in attribute evaluation
            $scope.$watch(function () {
                return getter($scope);
            }, function (val) {
                if (!val) {
                    if ($elem[0].type === 'radio' || $elem[0].type === 'checkbox' ||
                        $elem[0].hasOwnProperty('checked')) {
                        ngModel.$setViewValue(false);
                        $elem[0].checked = false;
                    } else {
                        ngModel.$setViewValue('');
                        $elem[0].value = '';
                    }
                }
            });
        }
    }
}());


/* DIRECTIVE: (data-int-model)
 * 
 * Declares the model specified by the required ng-model directive to be integer values.
 *
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-intModel-%5BA%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('intModel');

    module.directive(directiveName, IntModelDirective);

    IntModelDirective.$inject = [ruiServiceName('utils')];

    /* directive */
    function IntModelDirective(utils) {

        /* return */
        return {
            restrict: 'A',
            scope: false,
            require: 'ngModel',
            link: intModelLink
        };

        /* link */
        function intModelLink($scope, $elem, $attrs, ngModel) {
            ngModel.$formatters.push(function (value) {
                return value ? String(value) : null;
            });
            ngModel.$parsers.push(function (value) {
                return utils.parseInt(value, null);
            });
        }
    }
}());


/* DIRECTIVE: (<data-toggle>) 
 *
 * Add to an element to make it a button that toggles a value between true
 * and false.
 *
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-toggle-%5BA%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('toggle');

    module.directive(directiveName, ToggleDirective);

    ToggleDirective.$inject = ['$parse', ruiServiceName('utils')];

    /* directive */
    function ToggleDirective($parse, utils) {

        /* return */
        return {
            restrict: 'A',
            scope: false,
            link: toggleLink
        };

        /* link */
        function toggleLink($scope, $elem, $attrs) {

            var attrVal = $attrs[directiveName];
            if (!attrVal) {
                console.warn('toggle directive requires an expression to evaluate.');
                return;
            }

            var getter = $parse(attrVal);

            $elem.on('click', click);
            
            function click(e) {
                e.preventDefault();

                if ($elem.hasClass('disabled'))
                    return;

                utils.triggerUpdate(function () {
                    var toggle = !getter($scope);
                    getter.assign($scope, toggle);
                    $elem.toggleClass('active', toggle);
                });
            }
        }
    }
}());


/* DIRECTIVE: (<data-hover-toggle>) 
 *
 * Add to an element to make it toggle a value between true
 * and false when the user hovers over the element.
 *
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-hoverToggle-%5BA%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('hoverToggle');

    module.directive(directiveName, HoverToggleDirective);

    HoverToggleDirective.$inject = ['$parse', '$timeout', ruiServiceName('utils')];

    /* directive */
    function HoverToggleDirective($parse, $timeout, utils) {

        /* return */
        return {
            restrict: 'A',
            scope: false,
            link: toggleLink
        };

        /* link */
        function toggleLink($scope, $elem, $attrs) {

            var attrVal = $attrs[directiveName];
            if (!attrVal) {
                console.warn('hoverToggle directive requires an expression to evaluate.');
                return;
            }

            var getter = $parse(attrVal),
                delay = 0,
                promise;

            $elem.on('mouseenter', mouseEnter).on('mouseleave', mouseLeave);

            $attrs.$observe('toggleDelay', function (val) {
                delay = utils.parseInt(val, 0);
            });

            function mouseEnter() {
                if ($elem.hasClass('disabled'))
                    return;

                if (promise)
                    $timeout.cancel(promise);

                promise = $timeout(function () {
                    getter.assign($scope, true);
                    $elem.addClass('active');
                    promise = null;
                }, delay);
            }

            function mouseLeave() {
                if ($elem.hasClass('disabled'))
                    return;

                if (promise)
                    $timeout.cancel(promise);

                promise = $timeout(function () {
                    getter.assign($scope, false);
                    $elem.removeClass('active');
                    promise = null;
                }, delay);
            }
        }
    }
}());


/* SERVICE: utils
 * 
 * General utility functions.
 */
(function () {

    module.service(ruiServiceName('utils'), UtilsService);

    UtilsService.$inject = ['$timeout'];

    /* service */
    function UtilsService($timeout) {

        var service = this,
            updateData = {
                promise: null,
                callbacks: [],
                callback: function () {

                    updateData.promise = null;
                    updateData.callbacks.reverse();

                    while (updateData.callbacks.length) {
                        updateData.callbacks.pop()();
                    }
                }
            },
            matchSelectorName = (function () {
                var names = ['matches', 'msMatches', 'webkitMatches', 'mozMatches'];
                for (var i = 0, name; name = names[i]; i++) {
                    name += 'Selector';
                    if (document.body[name])
                        return name;
                }
                throw 'Valid matchesSelector function not found for current browser.';
            }());

        /**
         * Get computed style of an element.
         * 
         * @param   {Element} el   Angular or dom element to check.
         * @param   {string} rule  The name of the CSS rule to check.
         *                         
         * @returns {string} The CSS value of the specified rule.
         */
        this.getStyle = getStyle;

        /**
         * Provides shorter syntax for getting an elements
         * bounding client rectangle.
         * 
         * @param   {Element}  el  Angular or dom element.
         *                         
         * @returns {object}  The bounding client rectangle.
         */
        this.rect = rect;

        /**
         * Provides shorter syntax for prevent event default
         * and stopping immediate propogation.
         * 
         * @param {Event} e  The event to stop.
         */
        this.stopEvent = function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
        };

        /**
         * Disable or enable an element and all child elements that are
         * input, a, select, textarea, button or label elements.
         * 
         * Disable is acheived by adding disabled attribute and cancelling clicks.
         * 
         * The '.disabled' class is added to the specified element.
         * 
         * The specifed elements 'disabled' property is set to the isDisabled value.
         * 
         * @param {Element}  elem        Angular or dom element.
         * @param {boolean}  isDisabled  True to disable, false to enable.
         */
        this.disable = disable;

        /**
         * Determine if an element is disabled
         * 
         * @param   {Angular|Element}  elem  The element to check.
         * 
         * @returns {boolean}
         */
        this.isDisabled = isDisabled;

        /**
         * Determine if an element was clicked by searching for it 
         * from a mouse event target element up to the root parent.
         * 
         * @param   {Element} elem  Angular or dom element.
         * @param   {Event}   e     The event.
         *                          
         * @returns {boolean}
         */
        this.isClicked = isClicked;

        /**
         * Provides cleaner syntax for determining if an object is 
         * of a specified type.
         * 
         * @param   {object} obj   The object to check.
         * @param   {string} type  The name of the type to check for.
         *                         
         * @returns {boolean}
         */
        this.is = function (obj, type) {
            return typeof obj === type;
        };

        /**
         * Provides cleaner syntax for determining if an object is
         * of a specified type by calling the Object prototype 'toString'
         * method.
         * 
         * @param   {object}  obj   The object to check.
         * @param   {string}  type  The expected result of the call to 'toString'
         *                          
         * @returns {boolean}
         */
        this.isProto = function (obj, type) {
            return Object.prototype.toString.call(obj) === type;
        };

        /**
         * Provides cleaner syntax for determining if an object is defined.
         * 
         * @param   {object}  obj  The object to check.
         *                         
         * @returns {boolean}
         */
        this.isDefined = function (obj) {
            return !service.is(obj, 'undefined');
        };

        /**
         * Determine if an element has a specified attribute with or without
         * the 'data' prefix.
         * 
         * @param   {Element} el    Angular or dom element.
         * @param   {string}  name  The name of the attribute without data prefix.
         *                          
         * @returns {boolean}
         */
        this.hasAttr = function (el, name) {
            el = ae(service.getDomElem(el));
            return service.isDefined(el.attr(name)) || service.isDefined(el.attr('data-' + name));
        };
        
        /**
         * Get an element attribute value by checking the specified name 
         * as well as the name with a 'data' prefix.
         * 
         * @param   {Element} el    Angular or dom element.
         * @param   {string}  name  The name of the attribute without data prefix.
         *         
         * @returns {string}
         */
        this.getAttr = function (el, name) {
            el = service.getNgElem(el);
            return el.attr(name) || el.attr('data-' + name);
        };

        /**
         * Get pointer X page position from mouse or touch event.
         * 
         * @param {MouseEvent|TouchEvent} e  Mouse or touch event.
         *                                   
         * @return {number}
         */
        this.pointerX = function (e) {
            var isTouch = service.isDefined(e.touches),
                scroll = document.documentElement.scrollLeft || document.body.scrollLeft;
            return ((isTouch ? e.touches[0].clientX : e.pageX) || 0) - (isTouch ? 0 : scroll);
        };

        /**
         * Get pointer Y page position from mouse or touch event.
         * 
         * @param {MouseEvent|TouchEvent} e  Mouse or touch event.
         *                                   
         * @return {number}
         */
        this.pointerY = function (e) {
            var isTouch = service.isDefined(e.touches),
                scroll = document.documentElement.scrollTop || document.body.scrollTop;
            return ((isTouch ? e.touches[0].clientY : e.pageY) || 0) - (isTouch ? 0 : scroll);
        };

        /**
         * Parse a value that is meant to be a boolean.
         * 
         * @param {object} b  The boolean value.
         *                    
         * @return {boolean}
         */
        this.parseBool = parseBool;

        /**
         * Parse a potential base 10 integer or return default value if fail.
         * 
         * @param {object}  str     The object to parse.
         * @param {number}  defVal  The default value.
         */
        this.parseInt = function (str, defVal) {
            str = parseInt(str, 10);
            return isNaN(str) ? defVal : str;
        };
        
        /**
         * Parse a potential float or return default value if fail.
         * 
         * @param {object}  str     The object to parse.
         * @param {number}  defVal  The default value.
         */
        this.parseFloat = function (str, defVal) {
            str = parseFloat(str);
            return isNaN(str) ? defVal : str;
        };

        /**
         * Trigger angular update.
         */
        this.triggerUpdate = triggerUpdate;

        /**
         * Push a single item or an array of items into an array.
         * 
         * @param {Array}    array  The array to push into.
         * @param {?}        items  The item or array of items to add.
         */
        this.pushAll = function (array, items) {
            items = items instanceof Array ? items : [items];
            for (var i = 0; i < items.length; i++) {
                array.push(items[i]);
            }
        };

        /**
         * Splice specified items from an array.
         * 
         * @param   {Array}         array       The array to remove items from.
         * @param   {Array|object}  items       An item or array of items to be removed.
         * @param   {function}      [comparer]  Optional function to call when comparing items.
         *
         * @returns {Array} Array of spliced items.
         */
        this.spliceAll = spliceAll;

        /**
         * Determine if an array contains an item or at least 1 item 
         * from an array of items.
         * 
         * @param   {Array}        array       The array to check.
         * @param   {Array|object} items       An item or array of items to be removed.
         * @param   {function}     [comparer]  Optional function to call when comparing items.
         *                                
         * @returns {boolean}  True if at least 1 of the specified items were found.
         */
        this.arrayContains = arrayContains;

        /**
         * Determine if an element matches the specified selector.
         * 
         * @param   {Angular|Element}   elem      Angular or DOM element.
         * @param   {string}            selector  The selector.
         *                                        
         * @returns {boolean}
         */
        this.matches = function (elem, selector) {
            elem = service.getDomElem(elem);
            return elem[matchSelectorName](selector);
        };

        /**
         * Get the DOM element from an object that might be an angular/jquery element
         * or already a DOM element.
         * 
         * @param   {Angular|Element}   elem  The element.
         * 
         * @returns {Element}
         */
        this.getDomElem = function (elem) {
            if (!elem) return elem;
            return elem.nodeType ? elem : elem[0];
        };

        /**
         * Get the Angular element from an object that might be an angular/jquery element
         * or a DOM element.
         * 
         * @param   {Angular|Element}   elem  The element.
         *                                    
         * @returns {Angular}
         */
        this.getNgElem = function (elem) {
            if (!elem) return elem;
            return elem.nodeType ? ae(elem) : elem;
        };

        /**
         * Wrap properties and functions of an object with properties in another object.
         * 
         * @param   {object} obj     The object to wrap
         * @param   {object} wrapper The object to be a wrapper.
         */
        this.wrap = wrap;

        /**
         * Determine if a string ends with a specified suffix.
         *
         * @param  {string}  str     The string to check.
         * @param  {string}  suffix  The suffix to check for.
         *
         * @returns {boolean}
         */
        this.endsWith = function(str, suffix) {
            return str.indexOf(suffix, str.length - suffix.length) !== -1;
        };

        function arrayContains(array, items, comparer) {
            items = items instanceof Array ? items : [items];
            for (var i = 0; i < array.length; i++) {
                for (var j = 0; j < items.length; j++) {
                    if ((comparer && comparer(array[i], items[j])) || array[i] === items[j]) {
                        return true;
                    }
                }
            }
            return false;
        }

        function disable(elem, isDisabled) {
            elem = service.getDomElem(elem);

            var controls = ae(elem.querySelectorAll('input,a,select,textarea,button,label'));
            controls.push(elem);
            controls.toggleClass('disabled', isDisabled).prop('disabled', isDisabled);

            if (isDisabled) {
                controls.attr('disabled', 'disabled').on('click', service.stopEvent);
            } else {
                controls.removeAttr('disabled').off('click', service.stopEvent);
            }
        }

        function getStyle(el, rule) {
            el = service.getDomElem(el);
            var view = document.defaultView;

            if (view && view.getComputedStyle) {
                return view.getComputedStyle(el, '').getPropertyValue(rule);
            } else if (el.currentStyle) {
                rule = rule.replace(/\-(\w)/g, function (str, c) {
                    return c.toUpperCase();
                });
                return el.currentStyle[rule];
            }
            return '';
        }

        function isClicked(elem, e) {
            var el = e.target;
            while (el) {
                if (el === service.getDomElem(elem))
                    return true;
                el = el.parentNode;
            }
            return false;
        }

        function isDisabled(elem) {
            elem = service.getNgElem(elem);
            return elem.attr('disabled') || elem.hasClass('disabled') || elem[0].disabled;
        }

        function parseBool(b) {
            if (service.is(b, 'string')) {
                b = b.toLowerCase();
                return b !== '' && b !== 'false' && b !== 'no' && b !== 'off';
            }
            return b ? true : false;
        }

        function rect(el) {
            return service.getDomElem(el).getBoundingClientRect();
        }

        function spliceAll(array, items, comparer) {
            items = items instanceof Array ? items : [items];
            var result = [];
            for (var i = 0; i < array.length; i++) {
                for (var j = 0; j < items.length; j++) {
                    if ((comparer && comparer(array[i], items[j])) || array[i] === items[j]) {
                        result.push(array.splice(i, 1)[0]);
                        i--;
                        break;
                    }
                }
            }
            return result;
        }

        function triggerUpdate(callback) {

            if (callback)
                updateData.callbacks.push(callback);

            if (updateData.promise)
                return;

            updateData.promise = $timeout(updateData.callback, 1);
        }

        function wrap(obj, wrapper) {

            function wrap(name) {
                defineProperty(wrapper, name, {
                    get: function () {
                        return obj[name];
                    },
                    set: function (val) {
                        obj[name] = val;
                    }
                });
            }
            
            for (var name in obj) {

                // skip internal properties.
                if (name.indexOf('_') === 0)
                    continue;

                // skip functions
                if (typeof obj[name] === 'function') {
                    wrapper[name] = obj[name];
                }
                else {
                    wrap(name);
                }
            }
        }
    }
}());


/*
 * SERVICE: controls
 * 
 * (https://github.com/JCThePants/rawUI/wiki/Service:-ruiInputControls)
 */
(function () {

    module.service(ruiServiceName('inputControls'), InputControlsService);

    InputControlsService.$inject = [ruiServiceName('utils')];

    /* service */
    function InputControlsService(utils) {

        var service = this,
            querySelector = 'input,select,textarea',
            genericType = {

                // generic input value getter
                get: genericTypeGetter,

                // generic input value setter
                set: genericTypeSetter
            },
            types = {
                'input': genericType,
                'select': genericType,
                'textarea': genericType
            };

        /**
         * Register a custom control.
         * 
         * @param {string}   restrict        The value used in the directives restrict parameter.
         * @param {string}   queryName       The directive name using dashes (no camel case).
         * @param {function} [getValueFunc]  Function used to get value. Default is used if not provided.
         *                                   Takes single argument which is the element.
         * @param {function} [setValueFunc]  Function used to set value. Default is used if not provided.
         *                                   Takes 2 arguments: the element and the value to set.
         */
        this.register = register;

        /**
         * Get a query selector used to find control elements.
         * 
         * @returns {string}
         */
        this.getQuerySelector = function () {
            return querySelector;
        };
        
        /**
         * Create a query selector string used to find a directive element.
         * 
         * @param {string}   restrict        The value used in the directives restrict parameter.
         * @param {string}   queryName       The directive name using dashes (no camel cast).
         */
        this.createQuerySelector = createQuerySelector;

        /**
         * Find single input control by checking specified element and
         * its children.
         * 
         * @param   {Angular|Element}  elem  Element to check.
         *                                   
         * @returns {Angular}  Angular element.
         */
        this.findControl = findControl;

        /**
         * Get the value of an input element.
         * 
         * @param {Element} elem  The element.
         */
        this.getValue = getValue;

        /**
         * Set the value of an input element.
         * 
         * @param {Element} elem   The element.
         * @param {object}  value  The value to set.
         */
        this.setValue = setValue;


        function register(restrict, queryName, getValueFunc, setValueFunc) {
            var names = getQuerySelectorArray(restrict, queryName);

            for (var i = 0, name; name = names[i]; i++) {
                types[name] = {
                    get: getValueFunc || genericType.get,
                    set: setValueFunc || genericType.set
                };
            }

            querySelector = '';
            for (var name in types) {
                querySelector += querySelector ? ',' : '';
                querySelector += name;
            }
        }
        
        function createQuerySelector(restrict, queryName) {
            var names = getQuerySelectorArray(restrict, queryName);
            return names.join(',');
        }
        
        function getQuerySelectorArray(restrict, queryName) {
            var names = [];
            if (restrict.indexOf('E') !== -1) {
                names.push(queryName);
            }

            if (restrict.indexOf('A' !== -1)) {
                names.push('[' + queryName + ']');
                names.push('[data-' + queryName + ']');
            }

            if (restrict.indexOf('C' !== -1)) {
                names.push('.' + queryName);
                names.push('.' + (function () {
                    var c = queryName.split('-');
                    for (var i = 1, str; str = c[i]; i++) {
                        if (!str.length)
                            continue;
                        c[i] = str[0].toUpperCase() + str.substr(1);
                    }
                    return c.join('');
                }()));
            }
            return names;
        }

        function findControl(elem) {
            elem = utils.getNgElem(elem);

            // check if element is input
            if (utils.matches(elem, service.getQuerySelector())) {
                return elem;
            }

            // check element contains child input
            return ae(elem[0].querySelector(service.getQuerySelector()));
        }

        function getValue(elem) {
            var handlers = getHandlers(elem);
            return handlers ? handlers.get(elem) : null
        }

        function setValue(elem, value) {
            var handlers = getHandlers(elem);
            if (handlers)
                handlers.set(elem, value);
        }

        function getHandlers(elem) {
            elem = utils.getNgElem(elem);
            var el = elem[0],
                handlers = elem.prop('ruiInputHandlers');

            if (handlers)
                return handlers;

            for (var name in types) {
                if (utils.matches(el, name)) {
                    handlers = types[name];
                    break;
                }
            }

            elem.prop('ruiInputHandlers', handlers);
            return handlers;
        }

        function genericTypeGetter(elem) {
            elem = utils.getNgElem(elem);

            // get radio value
            if (elem.attr('type') === 'radio') {
                var name = elem.attr('name');
                if (name) {
                    var checked = document.body.querySelectorAll('input[name="' + name + '"]:checked');
                    return checked.length ? checked[0].value : null;
                }
            }
            // get checkbox value
            else if (elem.attr('type') === 'checkbox') {
                return elem[0].checked;
            }

            // get input value
            return elem[0].value;
        }

        function genericTypeSetter(elem, value) {
            elem = utils.getNgElem(elem);

            if (elem.attr('type') === 'radio') {
                var name = elem.attr('name');
                if (name) {
                    var radios = ae(document.getElementsByName(name));
                    for (var i = 0, radio; radio = radios[i]; i++) {
                        var checked = String(radio.value) === String(value);
                        radio.checked !== checked && (radio.checked = checked);
                    }
                }
            } else if (elem.attr('type') === 'checkbox') {
                elem[0].checked = value;
            } else {
                elem[0].value = value;
            }
        }
    }
}());


/* DIRECTIVE: (.control)
 *
 * Indicates an element is an input control or container for an input control and should add the '.has-value' class
 * if the input has a value.
 *
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-control-%5BC%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('control');
    
    module.directive(directiveName, ControlDirective);
    
    ControlDirective.$inject = [ruiServiceName('inputControls')];
    
    /* directive */
    function ControlDirective(controls) {

        /* return */
        return {
            restrict: 'AC',
            scope: true,
            link: controlLink
        };

        /* link */
        function controlLink($scope, $elem) {

            var input = controls.findControl($elem);
            if (!input.length)
                return;

            $scope.$watch(function () {
                return controls.getValue(input);
            }, function (val) {
                $elem.toggleClass('has-value', val);
            });
        }
    }

}());


/* SERVICE: popups
 * 
 * Handles all popup states.
 */
(function () {

    module.service(ruiServiceName('popups'), PopupsService);

    PopupsService.$inject = [ruiServiceName('utils')];

    /* service */
    function PopupsService(utils) {

        var service = this,
            keepOpen = [],
            states = {};

        /**
         * Toggle popup box open state.
         * 
         * @param   {string}   id       The element ID of the popup box.
         * @param   {boolean}  [state]  Set the popup state specifically instead of toggling.
         *
         * @returns {boolean}  The new state of the box.
         */
        this.toggle = function (id, state) {
            closeAll(id);
            return update(id, utils.isDefined(state) ? state : !states[id], 3);
        };

        /**
         * Close popup box.
         *
         * @param {string}  id  The element ID of the popup box.
         */
        this.open = function (id) {
            if (!states[id]) {
                closeAll(id);
                return update(id, true, 3);
            }
        };

        /**
         * Close popup box.
         *
         * @param {string}  id  The element ID of the popup box.
         */
        this.close = function (id) {
            if (states[id]) {
                update(id, false, 3);
            }
        };

        /**
         * Keep the specified popup open during the next popup closing.
         *
         * @param {string}  id        The ID of the popup box.
         * @param {string}  parentId  The ID of the popup box parent box.
         */
        this.keepOpen = function (id, parentId) {
            keepOpen.push({
                id: id,
                parentId: parentId
            });
        };

        /**
         * Close all popups that were opened within the specified parent popup box.
         * 
         * @param {string}  parentId  The ID of the parent popup box.
         */
        this.closeChildren = closeChildren;

        /**
         * Determine if a popup is open.
         * 
         * @param   {string}  id  The ID of the popup.
         *                        
         * @returns {boolean}
         */
        this.isOpen = function (id) {
            return states[id];
        };

        /**
         * Determine if an element is a popup box or button.
         * 
         * @param   {Element}  el  An angular or dom element to check.
         *                         
         * @returns {boolean}
         */
        this.isPopup = function (el) {
            return ae(el[0] || el).prop('isPopupElement');
        };


        // close popup if clicking outside of box
        window.addEventListener('click', function (e) {
            var el = e.target;
            while (el) {

                // determine if click came from popup element
                if (service.isPopup(el)) {
                    return;
                }
                el = el.parentElement;
            }
            closeAll(null, true);
        });


        function closeChildren(parentId) {
            var parent = document.getElementById(parentId);
            if (!parent)
                return;

            for (var id in states) {
                if (!states[id] || parentId === id)
                    continue;

                var el = document.getElementById(id);
                if (!el)
                    continue;

                while (el) {
                    if (el === parent) {
                        service.close(id);
                        break;
                    }
                    el = el.parentElement;
                }
            }
        }


        // determine if a popup should not be closed via 'closeAll' function
        function shouldKeepOpen(id) {
            for (var i = 0, item; item = keepOpen[i]; i++) {
                if (item.id === id)
                    return true;
            }
            return false;
        }


        // Close all popups. 
        // Optionally provide the id of the popup to exclude from closing.
        // Does not close popups in 'keepOpen' array unless force arg is true.
        // 'keepOpen array is cleared after call.
        function closeAll(except, force) {
            for (var id in states) {
                if (id === except || (!force && shouldKeepOpen(id)))
                    continue;

                update(id, false);
            }
            keepOpen.length = 0;
        }


        // update a popups visible state
        function update(id, isOpen, timeout) {
            // timeout so that window event listener does not
            // close the popup if this function is called in
            // response to a click.
            setTimeout(function () {
                states[id] = isOpen;
                var box = ae(document.getElementById(id));
                box.toggleClass('open', isOpen);
            }, timeout || 0);

            return isOpen;
        }
    }
}());


/* DIRECTIVE: (<popup-box>, data-popup-box, .popup-box)
 * 
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-popupBox-%5BEAC%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('popupBox');

    module.directive(directiveName, PopupBoxDirective);

    PopupBoxDirective.$inject = [ruiServiceName('popups')];

    /* directive */
    function PopupBoxDirective(popups) {

        /* return */
        return {
            restrict: 'EAC',
            link: popupBoxLink
        };

        /* link */
        function popupBoxLink($scope, $elem, $attrs) {

            var id;

            $attrs.$observe('id', function (val) {
                if (id) {
                    popups.close(id);
                    $elem.removeClass('open');
                }
                id = val;
            });

            $elem.prop('isPopupElement', true)
                .on('click', function (e) {

                    if (!id) {
                        console.warn('popup-box directive requires ID attribute.');
                        return;
                    }

                    var el = e.target;

                    while (el) {
                        if (el === $elem[0]) {
                            break;
                        }

                        // determine if click came from popup element
                        if (popups.isPopup(el))
                            return;

                        el = el.parentElement;
                    }

                    e.stopPropagation();

                    // click came from this element or a child that is not a popup, close all child popups
                    popups.closeChildren(id);
                });
        }
    }
}());


/* DIRECTIVE: (data-popup-button)
 * 
 * Toggles the 'open' state of a (data-popup-box) element.
 *
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-popupButton-%5BA%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('popupButton');

    module.directive(directiveName, PopupButtonDirective);

    PopupButtonDirective.$inject = [ruiServiceName('utils'), ruiServiceName('popups')];

    /* directive */
    function PopupButtonDirective(utils, popups) {
        var isDefined = utils.isDefined;

        /* return */
        return {
            restrict: 'A',
            scope: true,
            link: popupButtonLink
        };

        /* link */
        function popupButtonLink($scope, $elem, $attrs) {

            var id;

            $attrs.$observe(directiveName, function (val) {
                id = val;
            });

            $scope.$watch(function () {
                return popups.isOpen(id);
            }, function (isOpen) {
                $elem.toggleClass('active', isOpen);
            });

            $elem.prop('isPopupElement', true)
                .on('click', function (e) {
                    e.preventDefault();

                    if (!id) {
                        console.warn('popupButton directive requires attribute value to point to popup box ID attribute.');
                        return;
                    }
                
                    // make sure click did not come from child popup container or is disabled
                    var el = e.target,
                        ael;

                    while (el) {
                        ael = ae(el);
                        if (isDefined(ael.attr('data-popup-box')) || ael.hasClass('disabled')) {
                            return;
                        }
                        if (el === this)
                            break;

                        el = el.parentElement;
                    }

                    // check if this popup is a child of an open popup
                    el = $elem[0];
                    while (el) {
                        ael = ae(el);

                        // make sure the button is not disabled.
                        if (ael.hasClass('disabled'))
                            return;

                        // check if the button is also the popup box
                        if (ael.prop('isPopupElement')) {
                            popups.keepOpen(el.id, id);
                        }
                        el = el.parentElement;
                    }

                    e.stopPropagation();

                    // toggle popup
                    popups.toggle(id);
                });
        }
    }
}());


/* DIRECTIVE: (<select-box>, data-select-box, .select-box)
 *
 * Provides functionality for a custom select element.
 *
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-selectBox-%5BEAC%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('selectBox');

    registerElement('select-box');

    module.directive(directiveName, SelectBoxDirective);

    SelectBoxDirective.$inject = ['$parse', ruiServiceName('utils'), ruiServiceName('inputControls')];

    /* directive */
    function SelectBoxDirective($parse, utils, controls) {

        var index = 200;
        controls.register('EAC', 'select-box');

        /* return */
        return {
            restrict: 'EAC',
            require: 'ngModel',
            scope: true,
            controller: ['$scope', '$element', selectBoxController],
            controllerAs: 'select',
            link: selectBoxLink
        };

        /* controller */
        function selectBoxController($scope, $elem) {

            var doc = ae(document),
                isOpen = false;

            /**
             * Get or set the active slider handle controller.
             */
            defineProperty(this, 'isOpen', {
                get: isOpenGetter,
                set: isOpenSetter,
                enumerable: true
            });
            
            /**
             * Determine if the select is disabled.
             */
            defineProperty(this, 'isDisabled', {
                get: isDisabledGetter,
                enumerable: true
            });

            function isOpenGetter() {
                return isOpen;
            }

            function isOpenSetter(val) {
                val = utils.parseBool(val);
                val ? open() : close();
            }
            
            function isDisabledGetter() {
                return $elem.hasClass('disabled');
            }

            function open() {
                isOpen = true;
                $elem.addClass('open');
                setTimeout(function () {
                    $scope.selectDropdown.css('width', utils.rect($elem).width + 'px');
                    doc.bind('click', close);
                }, 1);
                $scope.$apply();
            }

            function close() {
                isOpen = false;
                $elem.removeClass('open');
                doc.unbind('click', close);
                setTimeout(function () {
                    $scope.selectDropdown.css('width', utils.rect($elem).width + 'px');
                }, 1);
                $scope.$apply();
            }
        }

        /* link */
        function selectBoxLink($scope, $elem, $attrs, ngModel) {

            var select = $scope.select,
                lbl = ae($elem[0].querySelector('.value')),
                ul = ae($elem[0].querySelector('ul,ol')),
                selected;

            if (ul.length === 0) {
                console.warn('select-box requires unordered or ordered list element as child.');
                return;
            }

            $elem.prepend(ae('<span class="select-button"></span>')).css('z-index', index--);
            lbl.length == 0 && $elem.prepend(lbl = ae('<span class="value"></span>'));

            $scope.selectDropdown = ul;
            $scope.selectLabel = lbl;

            // select box click handler
            $elem.on('click', selectClick);

            ul.on('click', dropdownClick);

            // set initial selected value
            setVal(ngModel.$modelValue);

            // watch for changes in model
            $scope.$watch(function () {
                return ngModel.$modelValue;
            }, function (val) {
                setVal(val);
            });

            // watch for changes in value
            $scope.$watch(function () {
                return $elem[0].value;
            }, function (val) {
                setVal(val);
            });

            function setVal(value) {

                selected && selected.removeAttr('data-selected');

                selected = ae(ul[0].querySelector('li[data-value="' + value + '"]'));

                if (selected.length !== 0) {
                    lbl.html(selected.html());
                    $elem.addClass('has-value')[0].value = value;
                    selected.attr('data-selected', 'true');
                } else {
                    lbl.text('');
                    $elem.removeClass('has-value')[0].value = value;
                }
            }
            
            function selectClick() {
                // make sure the box is not disabled.
                if (select.isDisabled) {
                    select.isOpen = false;
                    return;
                }
                select.isOpen = !select.isOpen;
            }
            
            function dropdownClick(e) {

                // prevent clicking in drop down from causing double action
                e.stopImmediatePropagation();

                var clicked = e.target,
                    newSelected;

                // find clicked list item (searching instead of caching allows dynamic add and remove of LI elements)
                while (clicked && clicked !== ul[0]) {
                    if (clicked.tagName === 'LI' && clicked.parentNode === ul[0]) {
                        newSelected = ae(clicked);
                        break;
                    }
                    clicked = clicked.parentNode;
                }

                if (!newSelected)
                    return;

                selected.removeAttr('data-selected');
                selected = newSelected.attr('data-selected', true);
                lbl.html(selected.html());

                var value = $elem[0].value = utils.getAttr(selected, 'value')
                    || (utils.isDefined(selected[0].value) ? selected[0].value : selected.text());

                ngModel.$setViewValue(value);
                $elem.addClass('has-value')[0].value = value;
                select.isOpen = false;

                $attrs.onSelect && $parse($attrs.onSelect)($scope);
            }
        }
    }

}());


/* DIRECTIVE: (<slider-box>, data-slider-box, .slider-box)
 * 
 * A custom slider control element for changing numerical values.
 *
 * (https://github.com/JCThePants/rawUI/wiki/Directives:-sliderBox-%5BEAC%5D)
 */
(function () {

    var directiveName = ruiDirectiveName('sliderBox');

    registerElement('slider-box');

    module.directive(directiveName, SliderBoxDirective);
    SliderBoxDirective.$inject = ['$compile', ruiServiceName('utils'), ruiServiceName('inputControls')];

    /* directive */
    function SliderBoxDirective($compile, utils, controls) {

        var rect = utils.rect,
            horizontal = {
                name: 'horizontal',
                size: 'width',
                offset: 'left',
                pointer: 'pointerX'
            },
            vertical = {
                name: 'vertical',
                size: 'height',
                offset: 'top',
                pointer: 'pointerY'
            },
            handleQuery = controls.createQuerySelector('EAC', 'slider-box-handle'),
            ribbonQuery = controls.createQuerySelector('EAC', 'slider-box-ribbon');

        controls.register('EAC', 'slider-box');

        /* return */
        return {
            restrict: 'EAC',
            require: '?ngModel',
            scope: true,
            controller: ['$scope', '$element', '$attrs', sliderBoxController],
            controllerAs: 'slider',
            link: sliderBoxLink
        };

        /* controller */
        function sliderBoxController($scope, $elem, $attrs) {

            var ctrl = this,
                handles = [],
                activeHandleIndex = 0;

            /**
             * Get the slider orientation.
             */
            defineProperty(this, 'orientation', {
                get: orientationGetter,
                enumerable: true
            });

            /**
             * Get the track elements offset on the page. (left or top depending on orientation)
             */
            defineProperty(this, 'trackOffset', {
                get: trackOffsetGetter,
                enumerable: true
            });

            /**
             * Get the track elements size. (height or width depending on orientation)
             */
            defineProperty(this, 'trackSize', {
                get: trackSizeGetter,
                enumerable: true
            });

            /**
             * Get an array of child slider handle controllers.
             */
            defineProperty(this, 'handles', {
                value: handles,
                writable: false,
                enumerable: true
            });

            /**
             * Get or set the active slider handle controller.
             */
            defineProperty(this, 'activeHandle', {
                get: activeHandleGetter,
                set: activeHandleSetter,
                enumerable: true
            });

            /**
             * Get the value range.
             */
            defineProperty(this, 'range', {
                get: rangeGetter,
                enumerable: true
            });

            /**
             * Get the maximum value.
             */
            defineProperty(this, 'max', {
                get: maxGetter,
                enumerable: true
            });

            /**
             * Get the minimum value.
             */
            defineProperty(this, 'min', {
                get: minGetter,
                enumerable: true
            });

            /**
             * Get the value step.
             */
            defineProperty(this, 'step', {
                get: stepGetter,
                enumerable: true
            });

            /**
             * Determine if the slider is disabled.
             */
            defineProperty(this, 'isDisabled', {
                get: isDisabledGetter,
                enumerable: true
            });

            /**
             * Call to update slider box values array.
             * 
             * Used to compile an array of handle values for the slider box element value
             * and ng model if present.
             * 
             * If there is only 1 handle, the function is not run.
             */
            this.updateValues = function () {
                if (ctrl.handles.length <= 1)
                    return;

                var values = [];

                if ($scope.ngModel) {
                    if (!($scope.ngModel.$modelValue instanceof Array))
                        $scope.ngModel.$setViewModel(values);
                    else
                        values = $scope.ngModel.$modelValue;
                } else if ($elem[0].value instanceof Array) {
                    values = $elem[0].value;
                }

                values.length = 0;
                for (var i = 0, handle; handle = ctrl.handles[i]; i++) {
                    values.push(handle.value);
                }

                $elem[0].value = values;
            };

            function orientationGetter() {
                return $scope.sliderOrientation || horizontal;
            }

            function trackOffsetGetter() {
                return $scope.sliderTrack ? rect($scope.sliderTrack)[ctrl.orientation.offset] : 0;
            }

            function trackSizeGetter() {
                return $scope.sliderTrack ? rect($scope.sliderTrack)[ctrl.orientation.size] : 0;
            }

            function activeHandleGetter() {
                return handles[activeHandleIndex];
            }

            function activeHandleSetter(val) {
                var index = handles.indexOf(val);
                if (index >= 0)
                    activeHandleIndex = index;
            }

            function rangeGetter() {
                return ctrl.max - ctrl.min;
            }

            function maxGetter() {
                return utils.parseFloat($attrs.max, 100);
            }

            function minGetter() {
                return utils.parseFloat($attrs.min, 0);
            }

            function stepGetter() {
                var step = utils.parseFloat($attrs.step, 1);
                return step > 0 ? step : 1;
            }

            function isDisabledGetter() {
                return $elem.hasClass('disabled');
            }
        }

        /* link */
        function sliderBoxLink($scope, $elem, $attrs, ngModel) {

            var slider = $scope.slider,
                isDragging = false,
                trackContainer, track;

            init();

            // watch for value change
            $scope.$watch(function () {
                return $elem[0].value;
            }, function (val) {
                if (isDragging || !utils.isDefined(val))
                    return;

                slider.activeHandle && (slider.activeHandle.value = val);
                ngModel && ngModel.$setViewValue(val);
            });

            function setOffset(e, handle) {
                if (!handle)
                    return;

                var o = slider.orientation;

                handle.offset = utils[o.pointer](e) - slider.trackOffset - handle.halfSize;

                var value = handle.value;
                if (slider.handles.length === 1) {
                    $elem[0].value = value;
                }
            }

            function focus() {
                $elem.addClass('active')
                    .triggerHandler('focus');
            }

            function blur() {
                $elem.hasClass('active') && $elem.removeClass('active')
                    .triggerHandler('blur');
            }

            function init() {

                // setup optional edit button if present
                var editBtn = ae($elem[0].querySelector('.slider-box-edit-button'));
                if (editBtn.length) {

                    editBtn.on('click', function (e) {
                        if ($scope.slider.isDisabled)
                            return;

                        focus();
                    });

                    ae(document).on('click', blurClick);

                    $scope.$on('$destroy', function () {
                        ae(document).off('click', blurClick);
                    });

                    function blurClick(e) {
                        if (!$elem.hasClass('active') || utils.isClicked($elem, e))
                            return;
                        blur();
                    }
                }

                setupTrackContainer();

                setupTrack();

                setupRibbons();

                setupHandles();

                $scope.sliderTrack = track;
                $scope.sliderOrientation = rect(track).width > rect(track).height ? horizontal : vertical;
                $scope.ngModel = ngModel;
            }

            function setupTrackContainer() {
                trackContainer = ae($elem[0].querySelector('.slider-box-track-container'));
                if (!trackContainer.length) {
                    trackContainer = ae('<div class="slider-box-track-container"></div>');
                    $elem.append(trackContainer);
                }
            }

            function setupTrack() {
                track = ae($elem[0].querySelector('.slider-box-track'));
                if (!track.length) {
                    track = ae('<div class="slider-box-track"></div>');
                    trackContainer.append(track);
                }

                // track click
                track.on('click', function (e) {
                    utils.stopEvent(e);
                    if (isDragging || $scope.slider.isDisabled)
                        return;

                    setOffset(e, $scope.slider.activeHandle);
                });
            }

            function setupHandles() {

                var handles = ae($elem[0].querySelectorAll(handleQuery));
                if (!handles.length) {

                    if (!ngModel)
                        throw 'Missing model for slider box.';

                    handles = ae('<div class="slider-box-handle" ng-model="' + $attrs.ngModel + '"></div>');
                    track.append(handles);
                    $compile(handles)($scope);
                } else {
                    track.append(handles);
                }
            }

            function setupRibbons() {
                var ribbons = ae($elem[0].querySelectorAll(ribbonQuery));
                track.append(ribbons);
            }
        }
    }

}());


/* DIRECTIVE: (<slider-box-handle>, data-slider-box-handle, .slider-box-handle)
 */
(function () {

    var directiveName = ruiDirectiveName('sliderBoxHandle');

    registerElement('slider-box-handle');

    module.directive(directiveName, SliderBoxHandleDirective);
    SliderBoxHandleDirective.$inject = [ruiServiceName('utils')];

    /* directive */
    function SliderBoxHandleDirective(utils) {

        var rect = utils.rect;

        /* return */
        return {
            restrict: 'EAC',
            require: ['^sliderBox', '^ngModel'],
            scope: true,
            controller: ['$scope', '$element', '$attrs', sliderBoxHandleController],
            controllerAs: 'handle',
            link: sliderBoxHandleLink
        };

        /* controller */
        function sliderBoxHandleController($scope, $elem, $attrs) {

            var ctrl = this,
                min, max;
            
            /**
             * Get the parent slider.
             */
            defineProperty(this, 'slider', {
                get: sliderGetter,
                enumerable: true
            });

            /**
             * Get the parent slider orientation.
             */
            defineProperty(this, 'orientation', {
                get: orientationGetter,
                enumerable: true
            });

            /**
             * Get the handles minimum value.
             */
            defineProperty(this, 'min', {
                get: minGetter,
                enumerable: true
            });

            /**
             * Get the handles maximum value.
             */
            defineProperty(this, 'max', {
                get: maxGetter,
                enumerable: true
            });

            /**
             * Get the handles offset in the track element.
             */
            defineProperty(this, 'offset', {
                get: offsetGetter,
                set: offsetSetter,
                enumerable: true
            });

            /**
             * Get the handles size. (width or height depending on orientation)
             */
            defineProperty(this, 'size', {
                get: sizeGetter,
                enumerable: true
            });

            /**
             * Get the handles size divided by 2.
             */
            defineProperty(this, 'halfSize', {
                get: halfSizeGetter,
                enumerable: true
            });

            /**
             * Get the handles value as a percent of its position in the track element.
             */
            defineProperty(this, 'percent', {
                get: percentGetter,
                enumerable: true
            });

            /**
             * Get or set the handle value.
             */
            defineProperty(this, 'value', {
                get: valueGetter,
                set: valueSetter,
                enumerable: true
            });
            
            // watch for changes to the minimum value attribute.
            $attrs.$observe('min', function (val) {
                min = val;
            });

            // watch for changes to the maximum value attribute.
            $attrs.$observe('max', function (val) {
                max = val;
            });
            
            function orientationGetter() {
                return $scope.slider.orientation;
            }
            
            function sliderGetter() {
                return $scope.slider;
            }
            
            function minGetter() {
                return parseFloat(min) || $scope.slider.min;
            }
            
            function maxGetter() {
                return parseFloat(max) || $scope.slider.max;
            }
            
            function offsetGetter() {
                return rect($elem)[ctrl.orientation.offset] - rect($scope.sliderTrack)[ctrl.orientation.offset];
            }

            function offsetSetter(val) {
                var offset = parseFloat(val) || 0,
                    trackRange = ctrl.slider.trackSize - ctrl.size,
                    minOffset = Math.max(0, trackRange * (ctrl.min / (ctrl.slider.range + ctrl.slider.min))),
                    maxOffset = Math.min(trackRange, trackRange * (ctrl.max / (ctrl.slider.range + ctrl.slider.min)));

                if (ctrl.orientation.name === 'vertical') {
                    var min = maxOffset,
                        max = minOffset;

                    minOffset = trackRange - min;
                    maxOffset = trackRange - max;
                }

                offset = Math.max(minOffset, Math.min(offset, maxOffset));
                $elem.css(ctrl.orientation.offset, offset + 'px');

                $scope.ngModel && $scope.ngModel.$setViewValue(ctrl.value);
                
                ctrl.slider.updateValues();
            }

            function sizeGetter() {
                return rect($elem)[ctrl.orientation.size];
            }
            
            function halfSizeGetter() {
                return ctrl.size / 2;
            }

            function percentGetter() {
                var percent = ctrl.offset / (ctrl.slider.trackSize - ctrl.size);
                return ctrl.orientation.name === 'vertical' ? 1 - percent : percent;
            }

            function valueGetter() {
                var value = ctrl.slider.range * ctrl.percent;
                value = Math.round(value / ctrl.slider.step) * ctrl.slider.step;
                value = Math.round(value * 100) / 100;
                return ctrl.slider.min + value;
            }

            function valueSetter(val) {
                val = parseFloat(val) || 0;
                val = Math.max(ctrl.min, val);
                val = Math.min(ctrl.max, val);

                var percent = Math.max(0, Math.min(1.0, (val - ctrl.slider.min) / ctrl.slider.range)),
                    valPercent = ctrl.orientation.name === 'vertical' ? 1 - percent : percent,
                    offset = (ctrl.slider.trackSize - ctrl.size) * valPercent;

                $elem.css(ctrl.orientation.offset, offset + 'px');
                
                $scope.ngModel && $scope.ngModel.$setViewValue(val);
                
                ctrl.slider.updateValues();
            }
        }


        /* link */
        function sliderBoxHandleLink($scope, $elem, $attrs, ctrls) {

            var slider = ctrls[0],
                ngModel = ctrls[1];

            var isDragging = false,
                pointerOffset = 0;

            slider.handles.push($scope.handle);
            $scope.ngModel = ngModel;

            // drag start
            $elem
                .on('mousedown', dragStart)
                .on('touchstart', dragStart);

            // drag handle release
            ae(document)
                .on('mouseup', dragEnd)
                .on('touchend', dragEnd);

            // drag handle move
            ae(document)
                .on('mousemove', dragMove)
                .on('touchmove', dragMove);

            // remove events from document when element is removed.
            $scope.$on('$destroy', function () {
                ae(document)
                    .off('mouseup', dragEnd)
                    .off('touchend', dragEnd)
                    .off('mousemove', dragMove)
                    .off('touchmove', dragMove);
            });

            // watch for model change
            $scope.$watch(function () {
                return ngModel.$modelValue;
            }, function (val) {
                !isDragging && ($scope.handle.value = val);
            });
            
            // watch for active handle changes
            $scope.$watch(function () {
                return slider.activeHandle;
            }, function (activeHandle) {
                $elem[activeHandle === $scope.handle ? 'addClass' : 'removeClass']('active');
            });

            function dragStart(e) {
                if (slider.isDisabled)
                    return;

                utils.stopEvent(e);
                slider.activeHandle = $scope.handle;

                isDragging = true;
                pointerOffset = utils[slider.orientation.pointer](e) - slider.handleOffset;
                $elem.addClass("dragging");
            }

            function dragEnd(e) {
                if (!isDragging)
                    return;

                $elem.removeClass("dragging");
                setTimeout(function () {
                    isDragging = false;
                    !slider.isDisabled && ($scope.handle.value = ngModel.$modelValue);
                }, 1);
            }

            function dragMove(e) {
                if (!isDragging || slider.isDisabled)
                    return;

                setOffset(e);
            }

            function setOffset(e) {
                var o = slider.orientation;
                $scope.handle.offset = utils[o.pointer](e) - slider.trackOffset - $scope.handle.halfSize;

                var value = $scope.handle.value;
                $elem[0].value = value;
                ngModel.$setViewValue(value);
            }
        }
    }

}());


/* DIRECTIVE: (<slider-box-ribbon>, data-slider-box-ribbon, .slider-box-ribbon)
 */
(function () {

    var directiveName = ruiDirectiveName('sliderBoxRibbon');

    registerElement('slider-box-ribbon');

    module.directive(directiveName, SliderBoxRibbonDirective);
    SliderBoxRibbonDirective.$inject = [ruiServiceName('utils')];

    /* directive */
    function SliderBoxRibbonDirective(utils) {

        /* return */
        return {
            restrict: 'EAC',
            require: '^sliderBox',
            scope: true,
            controller: ['$scope', '$element', '$attrs', sliderBoxRibbonController],
            controllerAs: 'ribbon'
        };

        /* controller */
        function sliderBoxRibbonController($scope, $elem, $attrs) {

            var self = this,
                anchor1, anchor2;

            /**
             * Get the parent slider.
             */
            defineProperty(this, 'slider', {
                get: sliderGetter,
                enumerable: true
            });

            /**
             * Get the parent slider orientation.
             */
            defineProperty(this, 'orientation', {
                get: orientationGetter,
                enumerable: true
            });

            /**
             * Get the 1st anchor value.
             */
            defineProperty(this, 'anchor1', {
                get: anchor1Getter,
                enumerable: true
            });

            /**
             * Get the 2nd anchor value.
             */
            defineProperty(this, 'anchor2', {
                get: anchor2Getter,
                enumerable: true
            });

            // observe anchor1 attribute for changes.
            $attrs.$observe('anchor1', function (val) {
                anchor1 = val;
                update();
            });

            // observe anchor2 attribute for changes.
            $attrs.$observe('anchor2', function (val) {
                anchor2 = val;
                update();
            });

            function orientationGetter() {
                return $scope.slider.orientation;
            }

            function sliderGetter() {
                return $scope.slider;
            }

            function anchor1Getter() {
                return utils.parseFloat(anchor1, $scope.slider.min);
            }

            function anchor2Getter() {
                return utils.parseFloat(anchor2, $scope.slider.max);
            }

            function update() {
                var a1 = getOffset(self.anchor1),
                    a2 = getOffset(self.anchor2);

                $elem.css(self.orientation.offset, Math.min(a1, a2) + 'px');
                $elem.css(self.orientation.size, (Math.max(a1, a2) - Math.min(a1, a2)) + 'px');
            }

            function getOffset(val) {
                val = Math.max(self.slider.min, val);
                val = Math.min(self.slider.max, val);

                var percent = Math.max(0, Math.min(1.0, (val - self.slider.min) / self.slider.range)),
                    valPercent = self.orientation.name === 'vertical' ? 1 - percent : percent;

                return self.slider.trackSize * valPercent;
            }
        }
    }

}());
}(window, document));