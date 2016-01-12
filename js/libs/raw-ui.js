(function(window, document){
'use strict';
var module = angular.module('rawUI', []),
    ae = angular.element,
    defineProperty = Object.defineProperty;



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
 * Use to apply height based CSS transitions from 0px height to unknown/variable height).
 * 
 * The directive attribute value is an expression that indicates if the height should be 'auto'
 * or 0, where true === 'auto' and false === '0px'
 */
(function () {

    module.directive('transitionHeight', TransitionHeightDirective);

    TransitionHeightDirective.$inject = ['$parse', 'rawUI.utils'];

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
            var getter = $attrs.transitionHeight ? $parse($attrs.transitionHeight) : null,
                isOpen = false,
                rect = utils.rect,
                inProgress;

            if (!getter) {
                console.warn('transitionHeight directive requires a parseable boolean attribute value.');
                return;
            }

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
 * Disables an element when the attributes value evaluates as false.
 * 
 * When disabled:
 * 
 *     The class '.disabled' is added
 * 
 *     The attribute 'disabled=true' is added
 * 
 *     The element property 'disabled' is set to true.
 * 
 *     All children of the element that are input, a, select, textarea, button or label elements have
 *     the attribute 'disabled=true' added.
 * 
 *     A click handler that prevents default and stops immediate propogation is added to the element 
 *     as well as the previously specified child elements.
 * 
 * All previously mention changes are removed when the directives attribute value evaluates as true.
 */
(function () {

    module.directive('enable', EnableDirective);

    EnableDirective.$inject = ['$parse', 'rawUI.utils'];

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
            if (!$attrs.enable) {
                console.warn('enable directive requires an expression to evaluate.');
                return;
            }

            var getter = $parse($attrs.enable);

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
 * Disables an element when the attributes value evaluates as true.
 * 
 * When disabled:
 * 
 *     The class '.disabled' is added
 * 
 *     The attribute 'disabled=true' is added
 * 
 *     The element property 'disabled' is set to true.
 * 
 *     All children of the element that are input, a, select, textarea, button or label elements have
 *     the attribute 'disabled=true' added.
 * 
 *     A click handler that prevents default and stops immediate propogation is added to the element 
 *     as well as the previously specified child elements.
 *     
 * All previously mention changes are removed when the directives attribute value evaluates as false.
 */
(function () {

    module.directive('disable', DisableDirective);

    DisableDirective.$inject = ['$parse', 'rawUI.utils'];

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

            if (!$attrs.disable) {
                console.warn('"disable" directive requires an attribute value to evaluate.');
                return;
            }

            var getter = $parse($attrs.disable);

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

    module.directive('and', AndDirective);

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
            if (!$attrs.and) {
                console.warn('"and" directive requires expression to evaluate.');
                return;
            }

            var getter = $parse($attrs.and);

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
 */
(function () {

    module.directive('intModel', IntModelDirective);

    IntModelDirective.$inject = ['rawUI.utils'];

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
 * The directives attribute value should point to the scope variable 
 * that should be toggled. (parsed)
 * 
 * When toggled to a value of true, the '.active' class is added
 * to the element.
 *
 * If the '.disabled' class is added to the element, the toggle will
 * stop functioning.
 */
(function () {

    module.directive('toggle', ToggleDirective);

    ToggleDirective.$inject = ['$parse', 'rawUI.utils'];

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
            var getter = $parse($attrs.toggle);

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
 * The directives attribute value should point to the scope variable 
 * that should be toggled. (parsed)
 * 
 * When toggled to a value of true, the '.active' class is added
 * to the element.
 *
 * If the '.disabled' class is added to the element, the toggle will
 * stop functioning.
 * 
 * Additional attribute 'data-toggle-delay' can be used to set the number of milliseconds
 * to delay toggle.
 */
(function () {

    module.directive('hoverToggle', HoverToggleDirective);

    HoverToggleDirective.$inject = ['$parse', '$timeout', 'rawUI.utils'];

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

            var getter = $parse($attrs.hoverToggle),
                delay = 0,
                promise;

            $elem.on('mouseenter', mouseEnter).on('mouseleave', mouseLeave);

            $attrs.$observe('toggleDelay', function (val) {
                delay = utils.parseInt(val, 0);
            });

            function mouseEnter(e) {
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

            function mouseLeave(e) {
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

    module.service('rawUI.utils', UtilsService);

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

            if (isDisabled) {
                controls.attr('disabled', 'disabled').on('click', service.stopEvent);
            } else {
                controls.removeAttr('disabled').off('click', service.stopEvent);
            }
            ae(elem)[isDisabled ? 'addClass' : 'removeClass']('disabled')[0].disabled = isDisabled;
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
            elem = service.getDomElem(elem);

            var controls = ae(elem.querySelectorAll('input,a,select,textarea,button,label'));
            controls.push(elem);

            return controls.attr('disabled') || controls.hasClass('disabled') || controls[0].disabled;
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
 * Custom control service
 */
(function () {

    module.service('rawUI.inputControls', InputControlsService);

    InputControlsService.$inject = ['rawUI.utils'];

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
 * Useful for elements not included in library such as custom textbox. 
 * (can still be used on library controls for styling purposes, but not required)
 * 
 * Example:
 * 
 * <div class="control textbox">
 *     <input type="text" id="myText">
 *     <label for="myText">Default Text</label>
 * </div>
 * 
 * The markup above can be styled to have default text overlaying the input. CSS can be
 * used to hide the default text when the text input is given focus.
 * 
 * With the control directive, the textbox can be styled to hide the default text
 * whenever the input has a value. With a value in the text input, the above markup 
 * would become:
 * 
 * <div class="control textbox has-value">
 *     <input type="text" id="myText">
 *     <label for="myText">Default Text</label>
 * </div>
 * 
 */
(function () {
    
    module.directive('control', ControlDirective);
    
    ControlDirective.$inject = ['rawUI.inputControls'];
    
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


/*
 * Factory: CalendarView
 * 
 * Provides calendar functionality.
 */
(function () {

    module.factory('rawUI.CalendarView', CalendarViewFactory);

    CalendarViewFactory.$inject = ['rawUI.utils', 'rawUI.dateUtils', 'rawUI.calendars'];

    /* service */
    function CalendarViewFactory(utils, dateUtils, service) {

        return CalendarView;

        function CalendarView(ngModelCtrl, options) {

            if (!ngModelCtrl)
                throw 'ngModel is require to create a CalendarView instance.';

            var now = new Date(),
                currYear = now.getFullYear(),
                self = this,
                year = now.getFullYear(),
                month = now.getMonth() + 1,
                minYear = currYear - 25,
                maxYear = currYear + 25,
                yearArray,
                monthData,
                itemName,
                sync = options && utils.parseBool(options.isSyncView),
                multiSelect = options && utils.parseBool(options.isMultiSelect) && !sync;

            init();

            /**
             * Set calendar view year and month using Date.
             * 
             * @param   {Date}  date  The date.
             *                        
             * @returns {this}
             */
            this.setDate = setDate;

            /**
             * Set calendar view year and month.
             * 
             * @param {number}  year   The year.
             * @param {number}  month  The 1 based month value.
             */
            this.setView = setView;

            /**
             * Add a specified number of years to the current value.
             * 
             * @param {number} years  The number of years to add. Can be negative.
             */
            this.addYears = addYears;

            /**
             * Add a specified number of months to the current value.
             * 
             * @param {number} months  The number of months to add. Can be negative.
             */
            this.addMonths = addMonths;

            /**
             * Update calendar data.
             */
            this.updateData = updateData;

            /**
             * Get the object representing the specified year, month and date
             * from the selected items.
             * 
             * If no args are provided, all selected values are returned.
             * 
             * @param   {number}  [year]   The year to match.
             * @param   {number}  [month]  The month to match.
             * @param   {number}  [day]    The day to match.
             *                           
             * @returns {Array}  An array of matching items.
             */
            this.getSelectedItems = getSelectedItems;

            /**
             * Get the selected date(s) as Date object(s).
             * 
             * @returns {Date|Array|null}  Date or null for single select, Array of Date for multi select mode.
             */
            this.getSelectedDate = getSelectedDate;

            /**
             * Add a selected item or Array of selected items.
             * 
             * If the calendar is not multi select, all existing values are
             * cleared.
             * 
             * @param {Array|?}  item    Date value object or Array of date value objects.
             * @param {boolean}  toggle  If true and the item is already added, the item is removed.
             */
            this.addSelected = addSelected;

            /**
             * Set the selected item or Array of selected items.
             * 
             * If the calendar is not multi select and an array is provided, only
             * the first item is used.
             * 
             * @param {?} item  Date value object or Array of date value objects.
             */
            this.setSelected = setSelected;

            /**
             * Remove an item or array of items from the selected items.
             * 
             * @param {Array|object}  item  The item or items to remove.
             */
            this.removeSelected = removeSelected;

            /**
             * Clear all selected values.
             */
            this.clearSelected = clearSelected;

            /**
             * Changes the calendar view to show the closest selected value.
             */
            this.showSelected = showSelected;
            
            
            /**
             * Determine if the calendar is multi select.
             */
            defineProperty(this, 'isMultiSelect', {
                get: function () {
                    return multiSelect;
                },
                enumerable: true
            });
            
            /**
             * Determine if the calendar is sync view.
             */
            defineProperty(this, 'isSyncView', {
                get: function () {
                    return sync;
                },
                enumerable: true
            });

            /**
             * Get or set the name of the property to check for date value in objects used to determine
             * selected dates.
             */
            defineProperty(this, 'itemName', {
                get: function () {
                    return itemName;
                },
                set: function (val) {
                    itemName = val;
                },
                enumerable: true
            });

            /**
             * Get or set the full year.
             */
            defineProperty(this, 'year', {
                get: function () {
                    return year;
                },
                set: yearSetter,
                enumerable: true
            });

            /**
             * Get or set month.
             * 
             * The month is 1 based, not 0 based like the javascript Date object.
             */
            defineProperty(this, 'month', {
                get: function () {
                    return month;
                },
                set: monthSetter,
                enumerable: true
            });

            /**
             * Get or set minimum calendar year.
             */
            defineProperty(this, 'minYear', {
                get: function () {
                    return minYear;
                },
                set: minYearSetter,
                enumerable: true
            });

            /**
             * Get or set maximum calendar year.
             */
            defineProperty(this, 'maxYear', {
                get: function () {
                    return maxYear;
                },
                set: maxYearSetter,
                enumerable: true
            });

            /**
             * Get or set the radius range of the year.
             * 
             * The result is minYear = currentYear - radius
             * and maxYear = currentYear + radius.
             * 
             * Getting radius when min and max do not have an equal radius
             * will return the smaller of the two values.
             */
            defineProperty(this, 'yearRadius', {
                get: function () {
                    return Math.min(minYear, maxYear);
                },
                set: yearRadiusSetter,
                enumerable: true
            });


            /**
             * Get an array of years spanning from the minimum year value to the
             * maximum value.
             * 
             * @returns {Array} Array of numbers.
             */
            defineProperty(this, 'yearRange', {
                get: function () {
                    return yearArray;
                },
                enumerable: true
            });

            /**
             * Get data used to render current month calendar.
             * 
             * Returned value is in the format:
             * 
             *  [
             *     // week 1 row
             *     [ 
             *         // sunday
             *         {
             *             // empty, not in current month
             *         },
             *         // monday
             *         {
             *             year: 2015,
             *             month: 12,
             *             day: 28.
             *             selected: true,
             *             values: [new Date(2015, 12 - 1, 28)]  /* Array of selected objects that fall on this date
             *         }
             *         // tuesday...
             *     ]
             *     // week 2 row...
             *  ]
             */
            defineProperty(this, 'data', {
                get: function () {
                    return monthData;
                },
                enumerable: true
            });


            function init() {
                if (options) {

                    if (options.isSyncView && options.isMultiSelect)
                        throw 'CalendarView cannot be both sync-view and multi-select.';

                    if (options.year) {
                        year = utils.parseInt(options.year, year);
                    }

                    if (utils.isDefined(options.month)) {
                        month = utils.parseInt(options.month, month);
                    }

                    var radius = utils.parseInt(options.yearRadius, 0);
                    if (radius) {
                        minYear = currYear - radius;
                        maxYear = currYear + radius;
                    }

                    minYear = utils.parseInt(options.minYear, minYear);
                    maxYear = utils.parseInt(options.maxYear, maxYear);
                }

                yearArray = createYearArray(minYear, maxYear);
            }

            function addMonths(months) {
                var y = year,
                    m = month + utils.parseInt(months, 0);

                while (m <= 0) {
                    y--;
                    m = 12 + m;

                    if (!isValidYear(y))
                        return;
                }

                var date = new Date(y, m - 1, 1);
                year = date.getFullYear();
                month = date.getMonth() + 1;

                // synchronize calendar with model
                if (sync) {
                    syncModel({
                        year: year,
                        month: month
                    });
                }

                utils.triggerUpdate(function () {
                    updateData();
                });
            }

            function addSelected(item, toggle) {

                if (!multiSelect) {
                    setSelected(item);
                    return;
                }

                // remove items so they are not duplicated.
                var spliced = utils.spliceAll(ngModelCtrl.$modelValue, item, comparer);

                // remove spliced items if toggle so they are not added back.
                if (toggle && spliced.length) {
                    if (item instanceof Array) {
                        utils.spliceAll(item, spliced, comparer);
                    } else {
                        // the only item was spliced so we're done
                        updateData();
                        return;
                    }
                }

                // make sure model is array.
                if (!(ngModelCtrl.$modelValue instanceof Array)) {
                    if (ngModelCtrl.$modelValue) {
                        ngModelCtrl.$setViewValue([ngModelCtrl.$modelValue]);
                    } else {
                        ngModelCtrl.$setViewValue([]);
                    }
                }

                utils.pushAll(ngModelCtrl.$modelValue, item);
                updateData();
            }

            function addYears(years) {
                var y = year + utils.parseInt(years, 0);
                if (!isValidYear(y))
                    return;

                year = y;

                // synchronize calendar with model
                if (sync) {
                    syncModel({
                        year: y
                    });
                }

                utils.triggerUpdate(updateData);
            }

            function clearSelected() {
                ngModelCtrl.$setViewValue(multiSelect ? [] : null);
                updateData();
            }

            function getSelectedDate() {

                // multi select
                if (multiSelect) {
                    var result = [],
                        selected = ngModelCtrl.$modelValue instanceof Array ? ngModelCtrl.$modelValue : [ngModelCtrl.$modelValue];

                    for (var i = 0, item; i < selected.length; i++) {
                        item = selected[i];

                        if (!item) continue;

                        item = itemName ? selected[i][itemName] : selected[i];

                        var date = service.convertIn(item);
                        if (date)
                            result.push(date);
                    }
                    return result;
                }
                // single select
                else {
                    return service.convertIn(ngModelCtrl.$modelValue);
                }
            }

            function comparer(a, b) {
                if (a === b)
                    return true;

                var dateA = service.convertIn(a);
                var dateB = service.convertIn(b);

                if (!dateA && dateB)
                    return false;
                if (!dateB && dateA)
                    return false;
                if (!dateA && !dateB)
                    return true;

                return dateA.getFullYear() === dateB.getFullYear()
                    && dateA.getMonth() === dateB.getMonth()
                    && dateA.getDate() === dateB.getDate();
            }

            function getSelectedItems(year, month, day) {

                var result = [];

                if (!ngModelCtrl.$modelValue)
                    return result;

                var selected = ngModelCtrl.$modelValue instanceof Array
                    ? ngModelCtrl.$modelValue
                    : [ngModelCtrl.$modelValue];

                for (var i = 0, item; i < selected.length; i++) {
                    item = selected[i];

                    if (!item)
                        continue;

                    item = itemName ? selected[i][itemName] : selected[i];

                    var date = service.convertIn(item);
                    if (date) {
                        if (utils.isDefined(year) && date.getFullYear() !== year)
                            continue;

                        if (utils.isDefined(month) && date.getMonth() !== month - 1)
                            continue;

                        if (utils.isDefined(day) && date.getDate() !== day)
                            continue;
                    }

                    result.push(item);
                }

                return result;
            }

            function maxYearSetter(val) {
                maxYear = utils.parseInt(val, maxYear);
                yearArray = createYearArray(minYear, maxYear);
            }

            function minYearSetter(val) {
                minYear = parseInt(val) || minYear;
                yearArray = createYearArray(minYear, maxYear);
            }

            function monthSetter(val) {
                month = utils.parseInt(val, month);

                // synchronize calendar with model
                if (sync) {
                    syncModel({
                        month: month
                    });
                }

                utils.triggerUpdate(updateData);
            }

            function removeSelected(item) {

                if (ngModelCtrl.$modelValue instanceof Array) {
                    utils.spliceAll(ngModelCtrl.$modelValue, item);
                } else if (ngModelCtrl.$modelValue === item ||
                    (item instanceof Array && utils.arrayContains(item, ngModelCtrl.$modelValue, comparer))) {
                    ngModelCtrl.$setViewValue(null);
                }
                updateData();
            }

            function setDate(date) {
                date = dateUtils.parseDate(date);
                if (date) {
                    setView(date.getFullYear(), date.getMonth() + 1);
                }
                return self;
            }

            function setSelected(item) {

                if (multiSelect) {
                    var array = [];
                    if (item instanceof Array) {
                        utils.pushAll(array, item);
                    } else {
                        array.push(item);
                    }
                    ngModelCtrl.$setViewValue(array)

                } else {
                    if (item instanceof Array) {
                        ngModelCtrl.$setViewValue(item[0]);
                    } else {
                        ngModelCtrl.$setViewValue(item);
                    }
                }
                updateData();
            }

            function setView(y, m) {

                year = utils.parseInt(y, year);
                month = utils.parseInt(m, month);

                if (sync) {
                    syncModel({
                        year: year,
                        month: month
                    });
                }

                updateData();
                return self;
            }

            function showSelected() {

                // sync view always has selected value in view
                if (sync)
                    return;

                // see if there are already selected items in view
                var selected = getSelectedItems(year, month);
                if (selected.length)
                    return;

                selected = getSelectedItems();

                // sort by dates closest to current view year and month
                selected.sort(function (a, b) {
                    var dateA = service.convertIn(a);
                    var dateB = service.convertIn(b);

                    if (!dateA && dateB) return 1;
                    if (!dateB && dateA) return -1;
                    if (!dateA && !dateB) return 0;

                    var result = 0;
                    result -= (Math.abs(dateA.getFullYear() - year) * 12) + Math.abs(dateA.getMonth() + 1 - month);
                    result += (Math.abs(dateB.getFullYear() - year) * 12) + Math.abs(dateB.getMonth() + 1 - month);
                    return result;
                });

                var date = selected.pop();
                if (date) {
                    setView(date.getFullYear(), date.getMonth() + 1);
                }
            }

            function yearRadiusSetter(val) {
                var radius = utils.parseInt(val, Math.min(minYear, maxYear));
                minYear = currYear - radius;
                maxYear = currYear + radius;
                yearArray = createYearArray(minYear, maxYear);
            }


            function yearSetter(val) {
                val = utils.parseInt(val, year);
                if (isValidYear(val)) {
                    year = val;

                    // synchronize calendar with model
                    if (sync) {
                        syncModel({
                            year: year
                        });
                    }

                    utils.triggerUpdate(updateData);
                }
            }

            function updateData() {

                var y = year,
                    m = month,
                    first = new Date(y, m - 1, 1),
                    firstDay = first.getDay(),
                    total = dateUtils.daysInMonth(y, m),
                    data = [],
                    row;

                // add dates
                for (var i = 0; i < total + firstDay; i++) {
                    if (i % 7 === 0) {
                        row = [];
                        data.push(row);
                    }

                    // pad beginning of month
                    if (i < firstDay) {
                        row.push({});
                        continue;
                    }

                    var day = i - firstDay + 1,
                        values = getSelectedItems(y, m, day);

                    row.push({
                        year: y,
                        month: m,
                        day: day,
                        selected: values.length > 0,
                        values: values
                    });
                }

                monthData = data;
                utils.triggerUpdate();
            }


            function isValidYear(year) {
                year = parseInt(year) || 0;

                return year >= minYear && year <= maxYear;
            }

            // synchronize calendar with model
            function syncModel(mods) {
                var date = getSelectedDate();
                if (date) {
                    var newDate = dateUtils.modifyDate(date, mods),
                        daysInMonth = dateUtils.daysInMonth(mods.year || newDate.getFullYear(), mods.month || (newDate.getMonth() + 1));

                    // change to last day of month if current day is greater than days in month
                    if (date.getDate() > daysInMonth) {
                        mods.day = daysInMonth;
                        newDate = dateUtils.modifyDate(date, mods);
                    }

                    ngModelCtrl.$setViewValue(newDate);
                }
            }

            function createYearArray(min, max) {
                var array = [];
                for (var i = min; i <= max; i++) {
                    array.push(i);
                }
                return array;
            }
        }
    }

}());


/*
 * SERVICE: date utils
 * 
 * Provides date manipulation utilities.
 */
(function () {

    module.service('rawUI.dateUtils', DateUtilsService);

    DateUtilsService.$inject = ['rawUI.utils'];

    /* service */
    function DateUtilsService(utils) {

        var service = this;

        /**
         * Parse a potential date value into a Date object.
         * 
         * @param   {object}  date  The potential date value to parse.
         *                          
         * @returns {Date|null}
         */
        this.parseDate = parseDate;

        /**
         * Get the number of days in a month.
         * 
         * Omit all arguments for current month.
         * 
         * @param  {number}  year   The year of the month to check. 
         * @param  {number}  month  The 1 based index of the month to check.
         * 
         * @returns {number}
         */
        this.daysInMonth = daysInMonth;

        /**
         * Create a new modified Date object using an existing Date.
         * 
         * @param {Date}    date   The source Date object.
         * @param {object}  mods   An object with properties containing date components to modify.
         *                         All properties in the object are optional. If not provided, the value
         *                         from the 'date' argument is used.
         *                         
         *                         mods = {
         *                             year: 2015,
         *                             month: 1, // january
         *                             day: 10,
         *                             hour: 5,
         *                             minute: 6,
         *                             seconds: 55,
         *                             milliseconds: 900
         *                         };
         */
        this.modifyDate = modifyDate;


        /**
         * Create a new Date object from the supplied Date object and add the
         * specified number of years.
         *
         * @param {Date}    date   The source date.
         * @param {number}  years  The number of years to add. Can be negative.
         */
        this.addYears = addYears;

        /**
         * Create a new Date object from the supplied Date object and add the
         * specified number of months.
         *
         * @param {Date}    date    The source date.
         * @param {number}  months  The number of months to add. Can be negative.
         */
        this.addMonths = addMonths;

        /**
         * Create a new Date object from the specified Date object and add the
         * specified number of days.
         *
         * @param {Date}    date   The source date.
         * @param {number}  days   The number of days to add. Can be negative.
         */
        this.addDays = addDays;

        /**
         * Create a new Date object from the supplied Date object and add the
         * specified number of hours.
         *
         * @param {Date}    date   The source date.
         * @param {number}  hours  The number of hours to add. Can be negative.
         */
        this.addHours = addHours;

        /**
         * Create a new Date object from the supplied Date object and add the
         * specified number of minutes.
         *
         * @param {Date}    date     The source date.
         * @param {number}  minutes  The number of minutes to add. Can be negative.
         */
        this.addMinutes = addMinutes;

        /**
         * Create a new Date object from the supplied Date object and add the
         * specified number of seconds.
         *
         * @param {Date}    date     The source date.
         * @param {number}  seconds  The number of seconds to add. Can be negative.
         */
        this.addSeconds = addSeconds;



        function addDays(date, days) {
            var year = date.getFullYear(),
                month = date.getMonth() + 1,
                day = date.getDate() + parseInt(days);

            while (day <= 0) {
                month--;
                day = service.daysInMonth(year, month) + day;
                while (month <= 0) {
                    month = 12 + month;
                    year--;
                }
            }
            service.modifyDate(date, {
                year: year,
                month: month,
                day: day
            });
        }

        function addHours(date, hours) {
            var year = date.getFullYear(),
                month = date.getMonth() + 1,
                day = date.getDate(),
                hour = date.getHours() + parseInt(hours);

            while (hour <= 0) {
                day--;
                hour = 24 + hour;
                while (day <= 0) {
                    month--;
                    day = service.daysInMonth(year, month) + day;
                    while (month <= 0) {
                        month = 12 + month;
                        year--;
                    }
                }
            }

            service.modifyDate(date, {
                year: year,
                month: month,
                day: day,
                hours: hour
            });
        }

        function addMinutes(date, minutes) {

            var year = date.getFullYear(),
                month = date.getMonth() + 1,
                day = date.getDate(),
                hour = date.getHours(),
                minute = date.getMinutes() + parseInt(minutes);

            while (minute <= 0) {
                hour--;
                minute = 60 + minute;
                while (hour <= 0) {
                    day--;
                    hour = 24 + hour;
                    while (day <= 0) {
                        month--;
                        day = service.daysInMonth(year, month) + day;
                        while (month <= 0) {
                            month = 12 + month;
                            year--;
                        }
                    }
                }
            }
            service.modifyDate(date, {
                year: year,
                month: month,
                day: day,
                hours: hour,
                minutes: minute
            });
        }

        function addMonths(date, months) {
            var year = date.getFullYear(),
                month = date.getMonth() + 1 + parseInt(months);

            while (month <= 0) {
                year--;
                month = 12 + month;
            }
            service.modifyDate(date, {
                year: year,
                month: month
            });
        }

        function addSeconds(date, seconds) {

            var year = date.getFullYear(),
                month = date.getMonth() + 1,
                day = date.getDate(),
                hour = date.getHours(),
                minute = date.getMinutes(),
                second = date.getSeconds() + seconds;

            while (second <= 0) {
                minute--;
                second = 60 + second;
                while (minute <= 0) {
                    hour--;
                    minute = 60 + minute;
                    while (hour <= 0) {
                        day--;
                        hour = 24 + hour;
                        while (day <= 0) {
                            month--;
                            day = service.daysInMonth(year, month) + day;
                            while (month <= 0) {
                                month = 12 + month;
                                year--;
                            }
                        }
                    }
                }
            }
            service.modifyDate(date, {
                year: year,
                month: month,
                day: day,
                hours: hour,
                minutes: minute,
                seconds: second
            });
        }


        function addYears(date, years) {
            return service.modifyDate(date, {
                year: date.getFullYear() + years
            });
        }

        function daysInMonth(year, month) {
            if (utils.isDefined(year))
                return new Date(parseInt(year), parseInt(month), 0).getDate();

            var now = new Date();
            return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        }

        function modifyDate(date, mods) {
            
            var year = utils.parseInt(mods.year, date.getFullYear()),
                month = utils.parseInt(mods.month, date.getMonth() + 1),
                day = utils.parseInt(mods.day, date.getDate()),
                hours = utils.parseInt(mods.hours, date.getHours()),
                minutes = utils.parseInt(mods.minutes, date.getMinutes()),
                seconds = utils.parseInt(mods.seconds, date.getSeconds()),
                milliseconds = utils.parseInt(mods.milliseconds, date.getMilliseconds());

            return new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);
        }

        function parseDate(date) {

            if (date) {
                if (utils.isProto(date, '[object Date]')) {
                    return date;
                }

                if (utils.is(date, 'string') || utils.is(date, 'number')) {
                    return new Date(date);
                }
            }
            return null;
        }
    }
}());


/*
 * SERVICE: calendar view
 * 
 * Provides calendar functionality.
 */
(function () {

    module.service('rawUI.calendars', CalendarService);

    CalendarService.$inject = ['rawUI.utils'];

    /* service */
    function CalendarService(utils) {

        var conversionOut = defConversionOut,
            conversionIn = defConversionIn;

        /**
         * Convert year, month, and day numbers into an object
         * to represent the date.
         * 
         * @param   {object} args   Object arguments. Object should have the following properties:
         *                          'year', 'month', 'day'.
         *
         * @returns {Date|?} Return value depends on the conversion callback. The default conversion 
         *                   function returns a Date object.
         */
        this.convertOut = function (args) {
            return conversionOut(args.year, args.month, args.day);
        };

        /**
         * Set the conversion callback used to convert a year, month, and day into 
         * the desired object for representing date.
         * 
         * The default conversion callback returns a Date object. Setting a custom callback will 
         * replace the default and is used if your data does not use Date objects or some other 
         * processing needs to be done on the return value. 
         * 
         * The conversion callback is used globally.
         * 
         * The callback is given 4 arguments when called:
         *     {number}  year   The year of the new value.
         *     {number}  month  The month (1 based) of the new value.
         *     {number}  day    The day of the month of the new value.
         * 
         * The value the callback return is used to replace the previous value.
         * 
         * @param {function} callback  The callback used to handle date conversions.
         */
        this.setConversionOut = function (callback) {
            conversionOut = callback || defConversionOut;
        };

        /**
         * Convert an item into a Date object.
         * 
         * @param   {?} item   The item to convert.
         *
         * @returns {Date|null}  Date or null if conversion failed.
         */
        this.convertIn = function (item) {
            return conversionIn(item);
        };

        /**
         * Set the conversion callback used to convert objects that are used to represent the date 
         * into Date objects.
         * 
         * The default conversion callback accepts date strings, millisecond time and Date objects. 
         * Setting a custom callback will replace the default and is used if your data does not store
         * dates in an object the default conversion can read.
         * 
         * The conversion callback is used globally.
         * 
         * The callback is given 1 arguments when called:
         *     {?}  item   The object to convert to a Date object.
         * 
         * The value the callback returns must be a Date object.
         * 
         * @param {function} callback  The callback used to handle date conversions.
         */
        this.setConversionIn = function (callback) {
            conversionIn = callback || defConversionIn;
        };

        
        
        function defConversionOut(year, month, day) {
            return new Date(year, month - 1, day);
        }

        function defConversionIn(item) {
            if (item) {
                if (utils.isProto(item, '[object Date]')) {
                    return item;
                }

                if (utils.is(item, 'string') || utils.is(item, 'number')) {
                    return new Date(item);
                }
            }
            return null;
        }
    }

}());


/* DIRECTIVE: (calendar-box, data-calendar-box, .calendar-box)
 * 
 * A calendar element with various configurations.
 * 
 * In most basic form, used as:
 *  
 *      <calendar-box ng-model="data"></calendar-box>
 *      
 * (data-ng-model) is a required directive.
 *      
 * After the directive is linked, the above becomes:
 * 
 *      <calendar-box ng-model="data">
 *          <div class="calendar">
 *              <div class="calendar-week calendar-header">
 *                   <span class="calendar-day">Su</span>
 *                   <span class="calendar-day">Mo</span>
 *                   <span class="calendar-day">Tu</span>
 *                   <span class="calendar-day">We</span>
 *                   <span class="calendar-day">Th</span>
 *                   <span class="calendar-day">Fr</span>
 *                   <span class="calendar-day">Sa</span>
 *              </div>
 *              <div class="calendar-week" ng-repeat="row in calendarData()">
 *                   <span class="calendar-day" ng-repeat="day in row" ng-class="{selected:day.selected,disabled:day.disabled}">
 *                       <a href="#" ng-class="{hidden:!day.year}" ng-click="select(day, $event)">{{day.day}}</a>
 *                   </span>
 *              </div>
 *          </div>
 *      </calendar-box>
 *      
 * The added elements are appended, allowing existing elements before the calendar that have access to the calendar scope.
 * 
 * If more control is needed over the placement of the calendar, include a div classed '.calendar' to indicate where the
 * calendar should be appended:
 * 
 *     <calendar-box ng-model="data">
 *         <div class="my-controls">Top controls</div>
 *         <div class="calendar"></div>
 *         <div class="my-controls">Bottom controls</div>
 *     </calendar-box>
 *     
 * A custom header '.calendar-header' can be used by including it:
 * 
 *     <calendar-box ng-model="data">
 *          <div class="calendar-week calendar-header">
 *               <span class="calendar-day">Sunday!</span>
 *               <span class="calendar-day">Monday!</span>
 *               <span class="calendar-day">Tuesday!</span>
 *               <span class="calendar-day">Wednesday!</span>
 *               <span class="calendar-day">Thursday!</span>
 *               <span class="calendar-day">Friday!</span>
 *               <span class="calendar-day">Saturday!</span>
 *          </div>
 *      </calendar-box>
 * 
 * Additional attributes:
 *      (data-multi-select)  Allows selecting and deselecting multiple dates. Data model is expected to be an Array
 *                           Cannot be used with (data-sync-view) attribute.
 *                           
 *      (data-sync-view)  Syncs the data model to the calendar view. If the month or year of the calendar view is changed, 
 *                        the month or year of the data model is also changed. Cannot be used with (data-multi-select)
 *                        
 *      (data-read-only)  Renders calendar without links for the user to change the selected date.
 *      
 *      (data-year-radius=)  Set the min and max year of the calendar based on a radius around the current year. Can be a static
 *                          number or an expression.
 *                          
 *      (data-min-year=)  Set the min year of the calendar. Can be a static number or an expression.
 *      
 *      (data-max-year=)  Set the max year of the calendar. Can be a static number or an expression.
 *      
 *      (data-year=)  Set the calendar view year. Can be a static number or an expression.
 *      
 *      (data-month=)  Set the calendar view month. Can be a static number or an expression. (1 based month index)
 *      
 * Scope functions/variables:
 * 
 *      calendar - The CalendarView instance. This contains functions that can be used by control elements to manipulate 
 *                 or display calendar data. See the ruiCalendarView service under the #createView function.
 *                 
 *      year - The calendar view year.
 *      month - The calendar view month.
 *      minYear - The calender min year.
 *      maxYear - The calendar max year.
 *      showSelected() - Change the calendar view to the year and month of the closest selected value.
 */
(function () {

    document.registerElement && document.registerElement('calendar-box');

    module.directive('calendarBox', CalendarBoxDirective);

    CalendarBoxDirective.$inject = ['$compile', 'rawUI.calendars', 'rawUI.CalendarView', 'rawUI.utils', 'rawUI.inputControls'];

    /* directive */
    function CalendarBoxDirective($compile, calendars, CalendarView, utils, controls) {

        controls.register('EAC', 'calendar-box');

        /* return */
        return {
            restrict: 'EAC',
            require: '^ngModel',
            scope: true,
            controller: calendarBoxController,
            controllerAs: 'calendar',
            link: calendarBoxLink
        };

        /* controller */
        function calendarBoxController() {

            var ctrl = this;

            // Controller functions and properties are copied from CalendarView class 
            // from within link function.

            this.select = function (data, e) {
                e && e.preventDefault();
                ctrl.addSelected(calendars.convertOut(data), true);
            };
        }

        /* link */
        function calendarBoxLink($scope, $elem, $attrs, ngModel) {

            var calendar = new CalendarView(ngModel, {
                isSyncView: utils.isDefined($attrs.syncView),
                isMultiSelect: utils.isDefined($attrs.multiSelect),
                yearRadius: $attrs.yearRadius,
                minYear: $attrs.minYear,
                maxYear: $attrs.maxYear,
                year: $attrs.year,
                month: $attrs.month
            });

            // copy calendar properties and functions to controller
            utils.wrap(calendar, $scope.calendar);

            var container = ae($elem[0].querySelector('.calendar') || '<div class="calendar"></div>'),

                day = (function () {
                    var templateContainer = ae($elem[0].querySelector(controls.createQuerySelector('A', 'calendar-day-template')));
                    if (templateContainer.length) {
                        return templateContainer.html();
                    } else if (utils.isDefined($attrs.readOnly)) {
                        return '<span ng-class="{hidden:!day.year}">{{day.day}}</a>';
                    }
                    return '<a href="#" ng-class="{hidden:!day.year}" ng-click="calendar.select(day, $event)">{{day.day}}</a>'
                }()),

                weekRows = ae($compile((function () {
                    var html = '<div class="calendar-week" ng-repeat="row in calendar.data">';
                    html += '<span class="calendar-day" ng-repeat="day in row" ng-class="{selected:day.selected,disabled:day.disabled}">';
                    html += day;
                    html += '</span></div>';
                    return html;
                }()))($scope));

            // setup calendar header
            (function () {
                var header = ae($elem[0].querySelector('.calendar-header')),
                    dayLen = Math.max(1, Math.min(3, parseInt($attrs.dayLen) || 2));

                if (header.length) {
                    header.remove();
                } else {
                    header = ae('<div class="calendar-week calendar-header"></div>')
                        .append('<span class="calendar-day">' + 'Sun'.substr(0, dayLen) + '<span>')
                        .append('<span class="calendar-day">' + 'Mon'.substr(0, dayLen) + '<span>')
                        .append('<span class="calendar-day">' + 'Tue'.substr(0, dayLen) + '<span>')
                        .append('<span class="calendar-day">' + 'Wed'.substr(0, dayLen) + '<span>')
                        .append('<span class="calendar-day">' + 'Thu'.substr(0, dayLen) + '<span>')
                        .append('<span class="calendar-day">' + 'Fri'.substr(0, dayLen) + '<span>')
                        .append('<span class="calendar-day">' + 'Sat'.substr(0, dayLen) + '<span>');
                }
                container.append(header);
            }());

            $elem.append(container.append(weekRows));

            if (calendar.isMultiSelect) {
                $scope.$watchCollection(getModelValue, updateValue);
            } else {
                $scope.$watch(getModelValue, updateValue);
            }

            utils.isDefined($attrs.yearRadius) && $attrs.$observe('yearRadius', function (val) {
                calendar.yearRadius = val;
            });

            utils.isDefined($attrs.year) && $attrs.$observe('year', function (val) {
                calendar.year = val;
            });

            utils.isDefined($attrs.month) && $attrs.$observe('month', function (val) {
                calendar.month = val;
            });

            utils.isDefined($attrs.maxYear) && $attrs.$observe('maxYear', function (val) {
                calendar.maxYear = val;
            });

            utils.isDefined($attrs.minYear) && $attrs.$observe('minYear', function (val) {
                calendar.minYear = val;
            });

            function getModelValue() {
                return ngModel.$modelValue;
            }

            function updateValue(val) {
                $elem[0].value = val;
                calendar.updateData();
            }
        }
    }

}());


/* SERVICE: modals
 *
 * Handles all modals.
 */
(function () {

    module.service('rawUI.modals', ModalsService);

    ModalsService.$inject = ['$rootScope', '$q', '$http', '$compile', 'rawUI.utils'];

    /* service */
    function ModalsService($rootScope, $q, $http, $compile, utils) {

        var service = this,
            cachedData = {},
            cachedTemplates = {},
            openModals = [];

        /**
         * Get the total number of open modals.
         */
        defineProperty(this, 'totalOpen', {
            get: function () { return openModals.length; },
            enumerable: true
        });

        /**
         * Get the currently active modal.
         */
        defineProperty(this, 'activeModal', {
            get: function () { return openModals[openModals.length - 1]; },
            enumerable: true
        });

        /**
         * Get or add predefined modal data.
         *
         * @param {string}  name       The name of the data object.
         * @param {object}  [dataObj]  The modal data object to add. Omit if retrieving object.
         *
         * @returns {object|this}
         */
        this.data = data;

        /**
         * Remove predefined modal data object.
         *
         * @param {string}  name  The name of the data object to remove.
         *
         * @returns {this}
         */
        this.deleteData = deleteData;

        /**
         * Get or add a template.
         *
         * @param {string}  name  The name of the template.
         * @param {string}  [path]  The path to the external template or the template string.
         *                          Path is detected by the presence of a .htm or .html file extension.
         *
         *@return {promise|this} Promise is returned when retrieving template, service is returned
         *                       when setting template.
         */
        this.templates = templates;

        /**
         * Open a modal.
         *
         * @param  {string}  templateName  The name of the modal template.
         * @param  {object}  [dataObj]     Optional data object.
         * @param  {$scope}  [scope]       Optional parent scope to use. A new isolated scope is
         *                                 created if omitted.
         * @param  {deferred}  [deferred]  Specify defer object to use. Used internally when template
         *                                 is not immediately available.
         *
         * @return {promise} A promise that returns a ModalInfo object.
         */
        this.open = open;

        /**
         * Close the most recent modal.
         */
        this.close = function () {
            service.activeModal.close();
        };

        /**
         * Close all modals.
         */
        this.closeAll = function () {
            while (openModals.length) {
                service.close();
            }
        };

        function data(name, dataObj) {
            if (utils.isDefined(dataObj)) {
                cachedData[name] = dataObj;
                return service;
            }
            return cachedData[name];
        }

        function deleteData(name) {
            if (cachedData.hasOwnProperty(name))
                delete cachedData[name];
            return service;
        }

        function open(templateName, dataObj, scope, deferred) {

            deferred = deferred || $q.defer();

            var template = cachedTemplates[templateName];
            if (!template) {
                deferred.reject(null);
                return deferred.promise;
            }

            // open template when it becomes available
            if (template.deferred) {
                template.deferred.promise.then(function () {
                    service.open(templateName, dataObj, scope, deferred);
                });
            }
            // open available template
            else {

                dataObj = dataObj || {};

                scope = scope ? scope.$new(false) : $rootScope.$new(true);

                defineProperty(scope, 'modalData', {
                    value: dataObj,
                    writable: false,
                    enumerable: true
                });

                var modal = ae(template),
                    info = new ModalInfo(templateName, modal, dataObj, scope);

                openModals.push(info);

                ae(document.body).append(modal);
                $compile(modal)(scope);

                deferred.resolve(info);
                return deferred.promise;
            }
        }

        function templates(name, path) {

            // setting template
            if (utils.isDefined(path)) {

                // check external template specified
                if (utils.endsWith(path, '.htm') || utils.endsWith(path, '.html')) {

                    var template = cachedTemplates[name];

                    // no deferred or cached template
                    if (!utils.isDefined(template)) {
                        loadExternalTemplate(name, path);
                    }
                }
                // template specified
                else {
                    cachedTemplates[name] = path;
                }
                return service;
            }

            // get template
            return getTemplate(name);
        }

        function loadExternalTemplate (name, path) {
            var deferred = $q.defer();
            cachedTemplates[name] = {
                deferred: deferred
            };
            $http.get(path).then(function (response) {
                cachedTemplates[name] = response.data;
                deferred.resolve(response.data);
            });
        }

        function getTemplate (name) {
            var template = cachedTemplates[name],
                deferred = $q.defer();

            if (!template) {
                deferred.reject(null);
            }
            else {
                // get a promise from the currently deferred template
                if (template.deferred) {
                    return template.deferred.promise;
                }

                deferred.resolve(template);
            }
            return deferred.promise;
        }

        /**
         * Open Modal handle.
         *
         * @param  {string}   templateName  The name of the modal template.
         * @param  {Angular}  elem          The modal element.
         * @param  {object}   data          The data object used when opening the modal.
         * @param  {$scope}   scope         The modal scope.
         *
         * @constructor
         */
        function ModalInfo(templateName, elem, data, scope) {

            var self = this,
                isClosed = false;

            /**
             * Get the name of the modal template.
             */
            defineProperty(this, 'templateName', {
                value: templateName,
                writable: false,
                enumerable: true
            });

            /**
             * Get the data specified when the modal was opened.
             */
            defineProperty(this, 'data', {
                value: data,
                writable: false,
                enumerable: true
            });

            /**
             * Determine if the modal has been closed.
             */
            defineProperty(this, 'isRemoved', {
                get: function () {
                    return isClosed;
                },
                enumerable: true
            });

            /**
             * Close the modal.
             */
            self.close = function () {
                var index = openModals.indexOf(self);
                if (index !== -1) {
                    openModals.splice(index, 1);
                    elem.remove();
                    scope.$destroy();
                    isClosed = true;
                    utils.triggerUpdate();
                }
            };
        }
    }
}());


/* DIRECTIVE: (<body>)
 *
 * Used to append 'modal-open' class to the body element when a modal is open.
 */
(function () {

    module.directive('body', ModalBodyDirective);

    ModalBodyDirective.$inject = ['rawUI.modals'];

    /* directive */
    function ModalBodyDirective(modals) {

        /* return */
        return {
            restrict: 'E',
            scope: false,
            link: modalCloseLink
        };

        /* link */
        function modalCloseLink($scope, $elem) {
            $scope.$watch(function () {
                return modals.totalOpen;
            }, function (total) {
                $elem.toggleClass('modal-open', total > 0);
            });
        }
    }
}());


/* DIRECTIVE: (data-modal-close)
 *
 * Creates a clickable button that closes a modal.
 */
(function () {

    module.directive('modalClose', ModalCloseDirective);

    ModalCloseDirective.$inject = ['rawUI.modals'];

    /* directive */
    function ModalCloseDirective(modals) {

        /* return */
        return {
            restrict: 'A',
            scope: false,
            link: modalCloseLink
        };

        /* link */
        function modalCloseLink($scope, $elem) {
            $elem.on('click', function (e) {
                e.preventDefault();
                modals.close();
            });
        }
    }
}());


/* DIRECTIVE: (data-modal-button)
 *
 * Creates a clickable button that closes a modal.
 */
(function () {

    module.directive('modalButton', ModalButtonDirective);

    /* directive */
    function ModalButtonDirective() {

        /* return */
        return {
            restrict: 'A',
            scope: false,
            link: modalButtonLink
        };

        /* link */
        function modalButtonLink($scope, $elem, $attrs) {

            var name = $attrs.modalButton,
                data = $scope.modalData;

            if (!name) {
                console.warn('modalButton attribute directive requires button name as value.');
                return;
            }

            if (!data)
                return;

            var click = data[name];
            if (click === true)
                return;

            if (typeof click === 'function') {
                $elem.on('click', click);
            }
            else {
                $elem.remove();
            }
        }
    }
}());


/* DIRECTIVE: (data-modal-component)
 *
 * Replaces a modal elements inner html with html specified in the modal options.
 *
 * If the modal options does not specify anything, the element is left as is if there
 * is already inner html or is removed if the element is empty.
 *
 * The attribute value is the name of the property in the modal options the inner html
 * will be pulled from. It can be a string or a function that returns a string or element.
 */
(function () {

    module.directive('modalComponent', ModalComponentDirective);

    /* directive */
    function ModalComponentDirective() {

        /* return */
        return {
            restrict: 'A',
            scope: false,
            link: modalComponentLink
        };

        /* link */
        function modalComponentLink($scope, $elem, $attrs) {

            if (!$attrs.modalComponent) {
                console.warn('modalComponent attribute directive requires component name as value.');
                return;
            }

            if (!$scope.modalData)
                return;

            var name = $attrs.modalComponent,
                inner = $scope.modalData[name];

            if (typeof inner === 'function') {
                inner = inner($scope.modalData);
            }

            // replace element html with inner
            if (inner) {
                $elem.html('').append(inner);
            }
            // remove element if no default text is included
            else if ($elem.html().trim() === '') {
                $elem.remove();
            }
        }
    }
}());


/* DIRECTIVE: (data-modal-template)
 *
 * Specifies an element (A <script> element) as a modal template.
 * The attributes value is the name of the modal template.
 */
(function () {

    module.directive('modalTemplate', ModalTemplateDirective);

    ModalTemplateDirective.$inject = ['rawUI.modals'];

    /* directive */
    function ModalTemplateDirective(modals) {

        /* return */
        return {
            restrict: 'A',
            scope: false,
            link: modalTemplateLink
        };

        /* link */
        function modalTemplateLink($scope, $elem, $attrs) {

            var name = $attrs.modalTemplate;
            if (!name) {
                console.warn('modalTemplate attribute directive requires template name as value.');
                return;
            }

            modals.templates(name, $elem.html());
        }
    }
}());


/* SERVICE: popups
 * 
 * Handles all popup states.
 */
(function () {

    module.service('rawUI.popups', PopupsService);

    /* service */
    function PopupsService() {

        var service = this,
            keepOpen = [],
            states = {};

        /**
         * Toggle popup box open state.
         * 
         * @param   {string}  id  The ID of the popup box.
         *
         * @returns {boolean}  The new state of the box.
         */
        this.toggle = function (id) {
            closeAll(id);
            return update(id, !states[id]);
        };

        /**
         * Close popup box.
         * 
         * @param {string}  id  The ID of the popup box.
         */
        this.close = function (id) {
            update(id, false);
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
        function update(id, isOpen) {
            states[id] = isOpen;
            var box = ae(document.getElementById(id));
            box.toggleClass('open', isOpen);
            return isOpen;
        }
    }
}());


/* DIRECTIVE: (data-popup-box, <popup-box>, .popup-box)
 * 
 * Popup element container that becomse visible or hides when a corresponding 
 * (data-popup-button) is clicked or a click is detected outside of the container.
 * 
 * The element the directive is applied to must have an ID attribute.
 * 
 * When the popup box is meant to be visible, the '.open' class is added.
 * 
 * A popup box can have child popup boxes. When child popup boxes are open, clicking 
 * the parent popup box closes all pen popups that are children of the clicked parent, 
 * but not the parent. Clicking outside of all popup boxes closes all popup boxes.
 */
(function () {

    module.directive('popupBox', PopupBoxDirective);

    PopupBoxDirective.$inject = ['rawUI.popups'];

    /* directive */
    function PopupBoxDirective(popups) {

        /* return */
        return {
            restrict: 'EAC',
            link: popupBoxLink
        };

        /* link */
        function popupBoxLink($scope, $elem, $attrs) {

            $elem.prop('isPopupElement', true)
                .on('click', function (e) {

                    if (!$attrs.id) {
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
                    popups.closeChildren($attrs.id);
                });
        }
    }
}());


/* DIRECTIVE: (data-popup-button)
 * 
 * Toggles the 'open' state of a (data-popup-box) element.
 * 
 * The attribute value is the value of the ID attribute of the (data-popup-box) element 
 * for which the button will toggle.
 * 
 * When the popup state is 'open', the '.active' class is added to the button element.
 * 
 * Attribute value is the ID of the popup container the button opens.
 * 
 * The popup button is allowed to be the same element as the popup box.
 */
(function () {

    module.directive('popupButton', PopupButtonDirective);

    PopupButtonDirective.$inject = ['rawUI.utils', 'rawUI.popups'];

    /* directive */
    function PopupButtonDirective(utils, popups) {
        var isDefined = utils.isDefined;

        /* return */
        return {
            restrict: 'A',
            link: popupButtonLink
        };

        /* link */
        function popupButtonLink($scope, $elem, $attrs) {

            var id = $attrs.popupButton;
            if (!id) {
                console.warn('popup-button directive requires attribute value to point to popup box ID attribute.');
                return;
            }
            
            $elem.prop('isPopupElement', true)
                .on('click', function (e) {
                    e.preventDefault();
                
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
                        if (isDefined(ael.attr('data-popup-box'))) {
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
 * The basic markup for the element is as follows:
 * 
 *    <select-box data-ng-model="selectValue">
 *        <ul>
 *            <li data-value="value1">Value 1</li>
 *        </ul>
 *    </select-box>
 *    
 * 
 * The <ul> element is used as a drop down list with it's child <li> elements as list items.  
 *    
 * The 'data-value' attribute on the <li> elements specifies the item value. If it is not provided, 
 * the <li> element contents are used as the value.
 * 
 * 
 * After the directive is linked, the previous markup would become:
 * 
 *    <select-box data-ng-model="selectValue">
 *        <span class="value"></span>
 *        <span class="select-button"></span>
 *        <ul>
 *            <li data-value="value1">Value 1</li>
 *        </ul>
 *    </select-box>
 *    
 * 
 * The '.value' and '.select-button' are prepended to the select box. For the '.value' element,
 * the directive first checks if one is already provided before adding one.
 * 
 * The '.value' element is used to show the display text of the currently selected value, which is 
 * the contents of the <li> element that is selected.
 * 
 * You can customize how the value displayed by providing the '.value' element in advance:
 * 
 *    <select-box data-ng-model="selectValue">
 *        <div class="my-select-display">
 *            <span class="value"></span> is Selected.
 *        </div>
 *        <ul>
 *            <li data-value="value1">Value 1</li>
 *        </ul>
 *    </select-box>
 *    
 * 
 * Although a toggle button is provided, the entire select box acts as a toggle button, minus the 
 * dropdown. The button span is provided so a familiar select button can be rendered if desired.
 * 
 * When a value is selected, the 'data-selected' attribute is added to the corresponding <li> element 
 * and removed from the rest.
 * 
 * When a value is selected, the '.has-value' class is added to the select box element.
 * 
 * When the user clicks the select box, the open state is toggled by adding or removing the '.open' 
 * class to the select box element. The '.open' class is removed if the user clicks outside of the
 * select box.
 * 
 * If the '.disabled' class is added to the select box element, the select box will not open when clicked.
 * 
 * The ng-model attribute is required.
 */
(function () {

    document.registerElement && document.registerElement('select-box');

    module.directive('selectBox', SelectBoxDirective);

    SelectBoxDirective.$inject = ['$parse', 'rawUI.utils', 'rawUI.inputControls'];

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
 * A custom slider control element for changin numberical values
 * 
 * The basic markup for the element is as follows:
 * 
 *    <slider-box data-ng-model="data.value"></slider-box>
 *    
 * After the directive is linked, the previous markup would become:
 * 
 *    <slider-box data-ng-model="data.value">
 *        <div class="slider-box-track-container">
 *            <div class="slider-box-track">
 *                <div class="slider-box-handle"></div>
 *            </div>
 *        </div>
 *    </slider-box>
 *    
 * The addition elements are appended to the slider box, allowing you to add other elements 
 * inside.
 * 
 * The '.slider-box-handle' element can be dragged by the user across the '.slider-box-track'
 * element. This is accomplished by setting the css 'left' or 'top' property 
 * of the handle, depending on orientation.
 * 
 * The orientation is determine by the track size. If the track is wider than tall, the slider
 * is horizontal, otherwise it is vertical.
 * 
 * For setting active state functionality, the directive will look for an optional child element
 * with the class '.slider-box-edit-button'. If it's found, clicking on it will cause the '.active'
 * class to be added to the slider box. Clicking outside the box or completing a handle drag will 
 * cause the '.active' class to be removed.
 * 
 * If the class '.disabled' is present on the slider box element, the slider will cease 
 * functionality until the class is removed.
 * 
 * Additional Attributes:
 * The following additional attributes can be added to the slider box element to configure it.
 *     data-min - default 0, sets the minimum value.
 *     data-max - default 100, set the maximum value.
 *     data-step - default 1, set the step between values.
 *     
 * Multiple handles can be added by pre-specifying them:
 * 
 *    <slider-box>
 *        <slider-box-handle ng-model="data.value1"></slider-box-handle>
 *        <slider-box-handle ng-model="data.value2"></slider-box-handle>
 *    </slider-box>
 *    
 * The handles are automatically placed into the slider track once it is appended by the directive.
 * 
 * Note that when specifying data model for a handle, the slider box element does not require a model.
 * 
 * For multiple handles, the slider box element value is an array of handle values as well as the slider box's
 * ng model (if specified).
 * 
 * 1 or more ribbons can also be specified:
 * 
 *    <slider-box>
 *        <slider-box-handle ng-model="data.value"></slider-box-handle>
 *        <slider-box-ribbon anchor1="0" anchor2="{{data.value}}"></slider-box-ribbon>
 *    </slider-box>
 *    
 * Ribbons are automatically placed into the slider track once it is appended by the directive.
 * 
 * The size of anchor1 value relative to anchor2 value is unimportant. The smaller value is always
 * position before the larger value.
 * 
 */
(function () {

    document.registerElement && document.registerElement('slider-box');

    module.directive('sliderBox', SliderBoxDirective);

    SliderBoxDirective.$inject = ['$compile', 'rawUI.utils', 'rawUI.inputControls'];

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

                    handles = ae('<slider-box-handle ng-model="' + $attrs.ngModel + '"></slider-box-handle>');
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

    document.registerElement && document.registerElement('slider-box-handle');

    module.directive('sliderBoxHandle', SliderBoxHandleDirective);

    SliderBoxHandleDirective.$inject = ['rawUI.utils'];

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

    document.registerElement && document.registerElement('slider-box-ribbon');

    module.directive('sliderBoxRibbon', SliderBoxRibbonDirective);

    SliderBoxRibbonDirective.$inject = ['rawUI.utils'];

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


/* Factory: TabularContext
 * 
 * TabularContext data class.
 */
(function () {
    module.factory('rawUI.TabularContext', TabularContextFactory);

    TabularContextFactory.$inject = ['rawUI.utils'];

    /* factory */
    function TabularContextFactory(utils) {

        return TabularContext;

        /**
         * TabularContext class.
         * 
         * @param {string} name  The context name.
         */
        function TabularContext(name) {
            var self = this,
                totalItems = 0,
                startIndex = 0,
                endIndex = 9,
                sort = {
                    name: '',
                    isAscending: true
                },
                isWaiting = false,
                changes = 0;

            /**
             * Get the context name.
             */
            defineProperty(this, 'name', {
                get: function () { return name; },
                enumerable: true
            });

            /**
             * Get or set the total available data items.
             */
            defineProperty(this, 'totalItems', {
                get: function () { return totalItems; },
                set: totalItemsSetter,
                enumerable: true
            });

            /**
             * Get or set the index of the first data item to show.
             */
            defineProperty(this, 'startIndex', {
                get: function () { return startIndex; },
                set: startIndexSetter,
                enumerable: true
            });

            /**
             * Get or set the index of the last data item to show.
             */
            defineProperty(this, 'endIndex', {
                get: function () { return endIndex; },
                set: endIndexSetter,
                enumerable: true
            });

            /**
             * Get or set sorting name.
             */
            defineProperty(this, 'sortName', {
                get: function () { return sort.name; },
                set: sortNameSetter,
                enumerable: true
            });

            /**
             * Get or set sort ascending or descending.
             */
            defineProperty(this, 'isSortAscend', {
                get: function () { return sort.isAscending; },
                set: isSortAscendSetter,
                enumerable: true
            });

            /**
             * Get or set the wait flag.
             * 
             * A value of true indicates that data is currently being retrieved
             * and the UI should wait until the flag becomes false before allowing
             * further manipulation of the tabular view.
             */
            defineProperty(this, 'isWaiting', {
                get: function () { return isWaiting; },
                set: isWaitingSetter,
                enumerable: true
            });

            /**
             * Get the number of times properties have been changed.
             * 
             * Useful to watch for changes.
             */
            defineProperty(this, 'changes', {
                get: function () { return changes; },
                enumerable: true
            });

            /**
             * Add a callback to invoke when a property is changed.
             * 
             * @param {object}    scope     The scope to watch from.
             * @param {function}  callback  A callback that has 1 arguments: function(modelContext)
             *                              
             * @returns {this}
             */
            this.watch = function (scope, callback) {

                scope.$watch(function () {
                    return changes;
                }, function () {
                    callback && callback(self);
                });

                return self;
            };

            function totalItemsSetter(val) {
                var newVal = utils.parseInt(val, 0);
                if (newVal !== totalItems) {
                    totalItems = newVal;
                    changes++;
                    utils.triggerUpdate();
                }
            }

            function startIndexSetter(val) {
                var newVal = utils.parseInt(val, 0);
                if (newVal !== startIndex) {
                    startIndex = newVal;
                    changes++;
                    utils.triggerUpdate();
                }
            }

            function endIndexSetter(val) {
                var newVal = utils.parseInt(val, 0);
                if (newVal !== endIndex) {
                    endIndex = newVal;
                    changes++;
                    utils.triggerUpdate();
                }
            }

            function sortNameSetter(val) {
                var newVal = String(val || '');
                if (newVal !== sort.name) {
                    sort.name = newVal;
                    changes++;
                    utils.triggerUpdate();
                }
            }

            function isSortAscendSetter(val) {
                var newVal = utils.parseBool(val);
                if (newVal !== sort.isAscending) {
                    sort.isAscending = newVal;
                    changes++;
                    utils.triggerUpdate();
                }
            }

            function isWaitingSetter(val) {
                isWaiting = utils.parseBool(val);
            }
        }
    }
}());


/*
 * FACTORY: TabularFilter class
 */
(function () {

    module.factory('rawUI.TabularFilter', TabularFilterFactory);

    /* factory */
    function TabularFilterFactory() {

        return TabularFilter;

        /**
         * An object that holds arbitrarily assigned properties which define filters.
         * Acts as an object to create bindings on from filter inputs.
         * 
         * Use by adding properties to the instance object with names that 
         * correspond to the item to be filtered and whose value specifies 
         * how the filter is applied.
         * 
         * To prevent conflicts with filter property names, the immutable properties
         * of the filter have names that begin with the '$' prefix. Do not use this
         * prefix for filter property names.
         */
        function TabularFilter() {
            var self = this;

            /**
             * Get a handle used to manipulate the filter.
             */
            defineProperty(this, '$handle', {
                value: new TabularFilterHandle(self),
                writable: false,
                configurable: false,
                enumerable: false
            });

            /**
             * Create a new object that contains only filter properties that have
             * been added to the instance.
             */
            defineProperty(this, '$filters', {
                get: function () {
                    var filters = {};
                    for (var name in this) {
                        if (!this.hasOwnProperty(name))
                            continue;

                        filters[name] = this[name];
                    }
                    return filters;
                },
                configurable: false,
                enumerable: false
            });
        }

        function TabularFilterHandle(filter) {

            /**
             * Delete all filters.
             */
            this.reset = function () {
                for (var name in filter) {
                    if (!filter.hasOwnProperty(name) || name.indexOf('$') === 0)
                        continue;

                    delete filter[name];
                }
            };

            /**
             * Create a new TabularFilter instance and copy current filter properties.
             */
            this.clone = function () {
                var tabFilter = new TabularFilter();
                for (var name in filter) {
                    if (!filter.hasOwnProperty(name) || name.indexOf('$') === 0)
                        continue;

                    tabFilter[name] = filter[name];
                }
                return tabFilter;
            };
        }
    }
}());


/* SERVICE: data models
 * 
 * Globally accessible data models.
 */
(function () {

    module.service('rawUI.tabularContexts', TabularContextsService);

    TabularContextsService.$inject = ['rawUI.TabularContext'];

    /* service */
    function TabularContextsService(TabularContext) {

        var contexts = {};

        /**
         * Determine if a tabular data context has been created.
         * 
         * @param   {string}  name  The name of the context.
         *                          
         * @returns {boolean}
         */
        this.hasContext = function (name) {
            return contexts.hasOwnProperty(name);
        };

        /**
         * Get or create a tabular data context.
         *
         * @param   {string} name  The name of the context.
         *
         * @returns {TabularContext}
         */
        this.getContext = function (name) {
            if (!name)
                throw 'Context name required.';

            if (contexts[name])
                return contexts[name];

            return contexts[name] = new TabularContext(name);
        };
    }
}());


/* DIRECTIVE: (data-tabular-context)
 *
 * Parent directive for tabular data directives that require a context to be specified.
 */
(function () {

    module.directive('tabularContext', TabularContextDirective);

    TabularContextDirective.$inject = ['rawUI.utils', 'rawUI.tabularContexts'];

    function TabularContextDirective(utils, contexts) {

        /* return */
        return {
            restrict: 'A',
            scope: true,
            controller: ['$attrs', tabularContextController],
            controllerAs: 'tabularContext',
            link: tabularContextLink
        };

        /* controller */
        function tabularContextController($attrs) {
            utils.wrap(contexts.getContext($attrs.tabularContext), this);
        }

        /* link */
        function tabularContextLink($scope, $elem, $attrs) {

            if (!$attrs.tabularContext) {
                console.warn('tabularContext directive requires a context name attribute value.')
            }
        }
    }
}());


/* SERVICE: sorting
 * 
 * Array sorting service
 */
(function () {

    module.service('rawUI.Sorting', SortingService);

    /* service */
    function SortingService() {

        var _service = this,
            _sorters = {};

        this.addSorter = function (name, func) {
            _sorters[name] = func;
            return _service;
        };

        this.sort = function (array, sorterName) {
            var sorter = _sorters[sorterName];
            if (!sorter)
                throw 'Sorter named "' + sorterName + '" not found.';

            array.sort(sorter);
        };

        this.sortBy = function (array, propName, isAscending) {
            array.sort(function (a, b) {
                if (a[propName] > b[propName]) return isAscending ? 1 : -1;
                if (a[propName] < b[propName]) return isAscending ? -1 : 1;
                return 0;
            });
        };
    }
}());


/* DIRECTIVE: (data-sort-by)
 *
 * A table header button that changes the tabular context sorting when pressed.
 * 
 * The attribute value is the sort name. How the name is used depends on how the 
 * controller that renders data is written.
 * 
 * When pressed, the sorting state will toggle between ascending and descending.
 * 
 * When the sorting state is ascending, the '.sort-ascending' class is added to the element,
 * when descending, the '.sort-descending' class is added.
 * 
 * If another 'sort by' button in the same tabular context is pressed, if its sort name is
 * different, the sorting state for this button becomes 'none' and all sort classes are 
 * removed.
 * 
 * In order to set the tabular context of the button, the button must be a child element
 * of the (data-tabular-context) directive.
 */
(function () {

    module.directive('sortBy', SortByDirective);

    SortByDirective.$inject = ['rawUI.utils'];

    /* directive */
    function SortByDirective(utils) {

        /* return */
        return {
            restrict: 'A',
            scope: true,
            require: '^tabularContext',
            link: sortByLink
        };

        /* link */
        function sortByLink($scope, $elem, $attrs, context) {

            var sortName = $attrs.sortBy;
            if (!sortName) {
                console.warn('sortBy directive requires an attribute value.');
                return;
            }

            $elem.on('click', function (e) {
                e.preventDefault();

                if (utils.isDisabled($elem) || context.isWaiting)
                    return;

                var isAscending = context.isSortAscend;

                if (context.sortName === sortName) {
                    isAscending = !isAscending;
                } else {
                    isAscending = true;
                }

                context.sortName = sortName;
                context.isSortAscend = isAscending;
            });

            $scope.$watch(function () {
                return context.sortName + context.isSortAscend;
            }, function () {
                if (context.sortName !== sortName) {
                    $elem.removeClass('sort-ascending sort-descending');
                } else if (context.isSortAscend) {
                    $elem.removeClass('sort-descending').addClass('sort-ascending');
                } else {
                    $elem.removeClass('sort-ascending').addClass('sort-descending');
                }
            });
        }
    }
}());


/* FACTORY: Pagination
 *
 * Pagination data holder class.
 */
(function () {

    module.factory('rawUI.Pagination', PaginationFactory);

    PaginationFactory.$inject = ['rawUI.utils'];

    /* factory */
    function PaginationFactory(utils) {
        
        return Pagination;

        function Pagination(context) {

            var ipp = function () {
                    return context.endIndex - context.startIndex + 1;
                },
                total = Math.ceil(context.totalItems / ipp()),
                page = Math.ceil(context.startIndex + 1 / ipp()),
                itemsPerPage = ipp(),
                changes = 0;

            /**
             * Get or set the total pages.
             */
            defineProperty(this, 'total', {
                get: function () { return total; },
                set: totalSetter,
                enumerable: true
            });

            /**
             * Get or set the current page.
             */
            defineProperty(this, 'page', {
                get: function () { return page; },
                set: pageSetter,
                enumerable: true
            });

            /**
             * Get or set the number of items per page.
             */
            defineProperty(this, 'itemsPerPage', {
                get: function () { return itemsPerPage; },
                set: itemsPerPageSetter,
                enumerable: true
            });

            /**
             * Get the number of times properties have been changed.
             * 
             * Useful to watch for changes.
             */
            defineProperty(this, 'changes', {
                get: function () { return changes; },
                enumerable: true
            });

            function totalSetter(val) {
                var newVal = Math.max(utils.parseInt(val, 0), 0);
                if (newVal !== total) {
                    total = newVal;
                    changes++;
                    utils.triggerUpdate();
                }
            }

            function pageSetter(val) {
                var newVal = Math.max(utils.parseInt(val, 1), 1);
                if (newVal !== page) {
                    page = newVal;
                    changes++;
                    utils.triggerUpdate();
                }
            }

            function itemsPerPageSetter(val) {
                var newVal = Math.max(utils.parseInt(val, 1), 1);
                if (newVal !== itemsPerPage) {
                    itemsPerPage = newVal;
                    changes++;
                    utils.triggerUpdate();
                }
            }
        }
    }
}());


/* DIRECTIVE: (data-pagination)
 *
 * Creates a tabular context for all child directives that require a tabular context.
 * 
 * Attribute value is used to specify tabular context name. If the directive is a child of the
 * (data-tabular-context) directive, then the context is already provided and attribtue value is 
 * not needed.
 */
(function () {

    module.directive('pagination', PaginationDirective);

    PaginationDirective.$inject = ['rawUI.utils', 'rawUI.tabularContexts', 'rawUI.Pagination'];

    /* directive */
    function PaginationDirective(utils, contexts, Pagination) {

        /* return */
        return {
            restrict: 'EAC',
            scope: true,
            require: '?^tabularContext',
            controller: ['$scope', '$attrs', paginationController],
            controllerAs: 'pagination',
            link: paginationLink
        };

        /* controller */
        function paginationController($scope, $attrs) {
            var context = $scope.tabularContext || contexts.getContext($attrs.pagination),
                pagin = context.pagination || (context.pagination = new Pagination(context));

            // wrap pagination instance with controller
            // (See Pagination class for bindable members)
            utils.wrap(pagin, this);

            // context getter
            defineProperty(this, 'context', {
                get: function () {
                    return context;
                },
                enumerable: true
            });

            // watch for relevant changes
            $scope.$watch(function () {
                return pagin.changes + context.totalItems;
            }, function () {

                pagin.total = Math.ceil(context.totalItems / pagin.itemsPerPage);

                // make sure current page isn't greater than total pages
                if (pagin.page > pagin.total)
                    pagin.page = 1;

                context.startIndex = (pagin.page - 1) * pagin.itemsPerPage;
                context.endIndex = context.startIndex + pagin.itemsPerPage - 1;
            });
        }

        /* link */
        function paginationLink($scope, $elem, $attrs, context) {

            if (!context && !$attrs.pagination)
                throw 'Tabular context required for pagination.';
        }
    }
}());


/* DIRECTIVE: (<pagination-next>, data-pagination-next, .pagination-next)
 *
 * A button that increments the pagination page by 1.
 */
(function () {

    module.directive('paginationNext', PaginationNextDirective);

    PaginationNextDirective.$inject = ['rawUI.utils'];

    /* directive */
    function PaginationNextDirective(utils) {

        /* return */
        return {
            restrict: 'EAC',
            scope: true,
            require: '^pagination',
            link: paginationNextLink
        };

        /* link */
        function paginationNextLink($scope, $elem, $attrs, pagin) {

            $elem.on('click', function (e) {
                e.preventDefault();

                if (utils.isDisabled($elem) || pagin.context.isWaiting)
                    return;

                pagin.page = Math.min(pagin.total, pagin.page + 1);
            });

            $scope.$watch('pagination.changes', function () {
                $elem.toggleClass('disabled', pagin.page >= pagin.total);
            });
        }
    }
}());


/* DIRECTIVE: (<pagination-prev>, data-pagination-prev, .pagination-prev)
 *
 * A button that decrements the pagination page by 1.
 */
(function () {

    module.directive('paginationPrev', PaginationPrevDirective);

    PaginationPrevDirective.$inject = ['rawUI.utils'];

    function PaginationPrevDirective(utils) {

        /* return */
        return {
            restrict: 'EAC',
            scope: true,
            require: '^pagination',
            link: paginationPrevLink
        };

        /* link */
        function paginationPrevLink($scope, $elem, $attrs, pagin) {

            $elem.on('click', function (e) {
                e.preventDefault();

                if (utils.isDisabled($elem) || pagin.context.isWaiting)
                    return;

                pagin.page = Math.max(1, pagin.page - 1);
            });

            $scope.$watch('pagination.changes', function () {
                $elem.toggleClass('disabled', pagin.page <= 1);
            });
        }
    }
}());


/* DIRECTIVE: (data-pagination-page)
 *
 * A button that sets the pagination page to the attribute value.
 */
(function () {

    module.directive('paginationPage', PaginationPageDirective);

    PaginationPageDirective.$inject = ['rawUI.utils'];

    /* directive */
    function PaginationPageDirective(utils) {

        /* return */
        return {
            restrict: 'A',
            scope: true,
            require: '^pagination',
            link: paginationPageLink
        };

        /* link */
        function paginationPageLink($scope, $elem, attrs, pagin) {

            $elem.on('click', function (e) {
                e.preventDefault();

                if (utils.isDisabled($elem) || pagin.context.isWaiting)
                    return;

                pagin.page = utils.parseInt(attrs.paginationPage, 1);
            });

            $scope.$watch('pagination.changes', function () {
                var page = utils.parseInt(attrs.paginationPage, 1);

                $elem.toggleClass('active', pagin.page === page);
                $elem.toggleClass('disabled', page < 1 || page > pagin.total);
            });
        }
    }
}());


/* DIRECTIVE: (data-pagination)
 *
 * Creates a tabular context for all child directives that require a tabular context.
 */
(function () {

    module.directive('paginationPager', PaginationPagerDirective);

    PaginationPagerDirective.$inject = ['rawUI.utils'];

    /* directive */
    function PaginationPagerDirective(utils) {

        /* return */
        return {
            restrict: 'A',
            scope: true,
            require: '^pagination',
            controller: ['$scope', '$attrs', paginationPagerController],
            controllerAs: 'pager',
            link: paginationPagerLink
        };

        /* controller */
        function paginationPagerController($scope, $attrs) {
            var vm = this,
                pages = [],
                total = 1,
                segment = 1,
                maxPages = utils.parseInt($attrs.paginationPager, 5),
                changes = 0;

            this.updatePages = updatePages;

            /**
             * Get tabular context.
             */
            defineProperty(this, 'context', {
                get: function () {
                    return $scope.pagination.context;
                },
                enumerable: true
            });

            /**
             * Get context pagination.
             */
            defineProperty(this, 'pagination', {
                get: function () {
                    return $scope.pagination;
                },
                enumerable: true
            });

            /**
             * Get an array of numbers representing the pages in the current visible segment.
             */
            defineProperty(this, 'pages', {
                get: function () {
                    return pages;
                },
                enumerable: true
            });

            /**
             * Get or set the total number of pager segments.
             */
            defineProperty(this, 'total', {
                get: function () {
                    return total;
                },
                set: totalSetter,
                enumerable: true
            });

            /**
             * Get the current visible page segment index.
             */
            defineProperty(this, 'segment', {
                get: function () {
                    return segment;
                },
                set: segmentSetter,
                enumerable: true
            });

            /**
             * Get the max number of pages visible at one time in the pager.
             */
            defineProperty(this, 'maxPages', {
                get: function () {
                    return maxPages;
                },
                enumerable: true
            });

            /**
             * Get the number of times properties have been changed.
             * 
             * Useful to watch for changes.
             */
            defineProperty(this, 'changes', {
                get: function () {
                    return changes;
                },
                enumerable: true
            });

            function updatePages() {
                pages = [];

                var start = (segment - 1) * maxPages + 1,
                    end = Math.min(start + maxPages - 1, $scope.pagination.total);

                for (var i = start; i <= end; i++) {
                    pages.push(i);
                }
            }

            function change() {
                changes++;
                vm.updatePages();
                utils.triggerUpdate();
            }

            function totalSetter(val) {
                var newVal = Math.max(utils.parseInt(val, 1), 1);
                if (newVal !== total) {
                    total = newVal;
                    change();
                }
            }

            function segmentSetter(val) {
                var newVal = Math.max(utils.parseInt(val, 1), 1);
                if (newVal !== segment) {
                    segment = newVal;
                    change();
                }
            }
        }

        /* link */
        function paginationPagerLink($scope, $elem, $attrs, pagin) {

            $scope.pagination = pagin;

            $scope.$watch('pagination.changes', function () {
                var pager = $scope.pager;

                pager.total = Math.ceil(pagin.total / pager.maxPages);
                pager.segment = pager.segment > pager.total ? 1 : Math.ceil(pagin.page / pager.maxPages);
                pager.updatePages();
            });

            $scope.pager.updatePages();
        }
    }
}());


/* DIRECTIVE: (<pagination-pager-next>, data-pagination-pager-next, .pagination-pager-next)
 *
 * A button that increments the pagination pager segment by 1.
 */
(function () {

    module.directive('paginationPagerNext', PaginationPagerNextDirective);

    PaginationPagerNextDirective.$inject = ['rawUI.utils'];

    /* directive */
    function PaginationPagerNextDirective(utils) {

        /* return */
        return {
            restrict: 'EAC',
            scope: true,
            require: '^paginationPager',
            link: paginationPagerNextLink
        };

        /* link */
        function paginationPagerNextLink($scope, $elem, $attrs, pager) {

            $elem.on('click', function (e) {
                e.preventDefault();

                if (utils.isDisabled($elem) || pager.context.isWaiting)
                    return;

                var pagin = pager.pagination;

                pager.segment = Math.min(pager.total, pager.segment + 1);

                // make sure active page is visible in pager
                var pageSegment = Math.ceil(pagin.page / pager.maxPages);
                if (pageSegment !== pager.segment) {
                    pagin.page = ((pager.segment - 1) * pager.maxPages) + 1;
                }
            });

            $scope.$watch('pager.changes', function () {
                $elem.toggleClass('disabled', pager.segment >= pager.total);
            });
        }
    }
}());


/* DIRECTIVE: (<pagination-pager-prev>, data-pagination-pager-prev, .pagination-pager-prev)
 *
 * A button that decrements the pagination pager segment by 1.
 */
(function () {

    module.directive('paginationPagerPrev', PaginationPagerPrevDirective);

    PaginationPagerPrevDirective.$inject = ['rawUI.utils'];

    function PaginationPagerPrevDirective(utils) {

        /* return */
        return {
            restrict: 'EAC',
            scope: true,
            require: '^paginationPager',
            link: paginationPagerPrevLink
        };

        /* link */
        function paginationPagerPrevLink($scope, $elem, $attrs, pager) {

            $elem.on('click', function (e) {
                e.preventDefault();
                if (utils.isDisabled($elem) || pager.context.isWaiting)
                    return;

                var pagin = pager.pagination;

                pager.segment = Math.max(1, pager.segment - 1);

                // make sure active page is visible in pager
                var pageSegment = Math.ceil(pagin.page / pager.maxPages);
                if (pageSegment !== pager.segment) {
                    pagin.page = ((pager.segment - 1) * pager.maxPages) + 1;
                }
            });

            $scope.$watch('pager.changes', function () {
                $elem.toggleClass('disabled', pager.segment <= 1);
            });
        }
    }
}());


/* SERVICE: validation
 *
 * Form input validation services.
 */
(function () {

    module.service('rawUI.validation', ValidationService);

    ValidationService.$inject = ['rawUI.utils', 'rawUI.inputControls'];

    /* service */
    function ValidationService(utils, controls) {

        var service = this,
            totalRegistered = 0,
            validators = {

                // 'required' validator ensures a value is provided.
                'required': function (value) {
                    return value && value !== '? undefined:undefined ?';
                }
            },
            registered = {};

        /**
         * Add a validator.
         * 
         * @param {string}    name     The name of the validator.
         * @param {function}  handler  The validator handler function which takes 1 argument, the value 
         *                             to validate, and returns true if valid and false if not.
         */
        this.addValidator = function (name, handler) {
            validators[name] = handler;
        };

        /**
         * Get a validator by name.
         * 
         * @param   {string}  name  The name of the validator
         *                          
         * @returns {object|null}   An object containing validator name and handler or null if not found.
         *                          result = {
         *                              name: 'validatorName',
         *                              validate: function (value)
         *                          }
         */
        this.getValidator = getValidator;

        /**
         * Get an array of validator functions by validator names.
         * 
         * @param   {string|Array}  handlerNames The names of the handlers to get. Can be a comma delimited string of names
         *                                       or an Array of string names.
         *                                       
         * @returns {Array} Array of validator objects.
         */
        this.getValidators = getValidators;

        /**
         * Validate an input by registered ID.
         * 
         * @param   {string}  id         The ID the input was registered with.
         * @param   {string}  [context]  If provided, the input must be registered under the specified context
         *                               or its validation result will be noValidate = true.
         *                        
         * @returns {object} Object results.
         *                   result = {
         *                      isValid: false, // true if valid
         *                      failed: 'required', // if isValid is false, the name of the validator that failed
         *                      noValidate: false // true if validation was not performed
         *                   }
         */
        this.validate = validate;

        /**
         * Validate all registered inputs in scope.
         * 
         * An input is not in scope if it has '.no-validate' class,
         * or is not visible.
         * 
         * @param  {string}  [context]  Context to validate. All contexts are validated if not provided.
         * @param  {Event}   [e]        Optional event to cancel if validation fails.
         * 
         * @returns {object} Result object.
         *                    result = {
         *                        isValid: false, // true if all inputs valid
         *                        context: 'myContext',
         *                        failed: {       // object of failed inputs
         *                            'inputId': 'failedHandlerName'
         *                        }
         *                    }
         */
        this.validateAll = validateAll;

        /**
         * Register an input element for validation.
         * 
         * @param   {Element}   elem          The element to register.
         * @param   {string}    handlerNames  Comma delimited list of validation handlers to use.
         * @param   {string}    [context]     Optional context of the input.
         * @param   {function}  [callback]    A callback to invoke after validation to return results in.
         * @param   {string}    [id]          The ID to assign. Auto generated if omitted.
         *
         * @returns {string}  The ID the input is registered with.
         */
        this.register = register;

        /**
         * Unregister an input element.
         * 
         * @param {string} id  The registered ID of the input element.
         */
        this.unregister = function (id) {
            delete registered[id];
        };



        function getValidator(name) {
            var validator = validators[name];
            if (validator) {
                return {
                    name: name,
                    validate: validator
                };
            } else {
                console.warn('Validator named "' + name + '" not found.');
                return null;
            }
        }


        function getValidators(handlerNames) {
            var names = handlerNamesToArray(handlerNames),
                result = [];

            for (var i = 0, name; name = names[i]; i++) {
                name = name.trim();
                var validator = service.getValidator(name);
                validator && result.push(validator);
            }
            return result;
        }


        function register(elem, handlerNames, context, callback, id) {
            elem = utils.getNgElem(elem);
            totalRegistered++;
            id = id || elem.attr('id') || 'input' + totalRegistered;

            var reg = registered[id];
            if (reg) {
                callback && reg.callback.push(callback);
                mergeValidators(reg.validators, handlerNames);
            } else {
                registered[id] = {
                    elem: elem,
                    context: context,
                    callback: [callback],
                    validators: service.getValidators(handlerNames || 'required')
                };
            }
            return id;
        }


        function validate(id, context) {
            var result = {
                isValid: true,
                failed: null,
                noValidate: true
            };
            var reged = registered[id];
            if (!reged) {
                result.isValid = false;
                return result;
            }

            if ((context && reged.context !== context) || !isInScope(reged.elem))
                return result;

            result.noValidate = false;

            var val = controls.getValue(reged.elem);

            for (var i = 0, v; v = reged.validators[i]; i++) {
                var isValid = v.validate(val);
                if (!isValid) {
                    result.isValid = false;
                    result.failed = v.name;
                    break;
                }
            }
            for (var j = 0, callback; callback = reged.callback[j]; j++) {
                callback(result.isValid, result.failed);
            }
            return result;
        }

        function validateAll(context, e) {
            var result = {
                isValid: true,
                context: context,
                failed: {}
            };

            for (var id in registered) {
                var r = service.validate(id, context);
                if (r.noValidate)
                    continue;

                if (!r.isValid) {
                    result.isValid = false;
                    result.failed[id] = r.failed;
                }
            }

            e && !r.isValid && utils.stopEvent(e);
            return result;
        }


        // ensure handler names are in an array
        function handlerNamesToArray(handlerNames) {
            var array = [];
            if (typeof handlerNames === 'string') {
                array = handlerNames.split(',');
                for (var i = 0, str; str = array[i]; i++) {
                    array[i] = str.trim();
                }
            } else if (handlerNames instanceof Array) {
                array = handlerNames;
            }
            return array;
        }

        // merge specified validators with existing validator array
        function mergeValidators(validators, handlerNames) {
            var newNames = handlerNamesToArray(handlerNames),
                comparer = function (v, name) {
                    return v.name === name;
                };

            for (var i = 0, name; name = newNames[i]; i++) {
                if (!utils.arrayContains(validators, name, comparer)) {
                    var validator = getValidator(name);
                    validator && validators.push(validator);
                }
            }
        }

        // determine if a validatable element is in scope.
        function isInScope(elem) {
            elem = utils.getNgElem(elem);

            if (elem.hasClass('no-validate') || elem.hasClass('ng-hide') || elem.hasClass('hidden')) {
                return false;
            }

            var el = elem[0];
            while (el.length) {
                if (utils.getStyle(el, 'display') === 'none' ||
                    utils.getStyle(el, 'visibility') !== 'visible' ||
                    utils.getStyle(el, 'opacity') === '0') {
                    return false;
                }

                el = el.parentNode;
            }

            return true;
        }
    }
}());


/*
 * DIRECTIVE: (data-validate-context)
 * 
 * Specify a validation context for child input controls that have the (data-validate) directive.
 */
(function () {

    module.directive('validateContext', ValidateContextDirective);

    /* directive */
    function ValidateContextDirective() {

        /* return */
        return {
            restrict: 'A',
            scope: true,
            link: validateContextLink
        };

        /* link */
        function validateContextLink($scope, $elem, $attrs) {
            if (!$attrs.validateContext) {
                console.warn('validate-context directive requires attribute value to set context name.');
                return;
            }
            $scope.validationContext = $attrs.validateContext;
        }
    }
}());


/* DIRECTIVE: (data-validate)
 * 
 * Validate input field. Works in conjunction with validation service.
 * The value of the attribute is a comma delimited list of validation handlers. If 
 * not provided, the default 'required' validator is used.
 */
(function () {

    module.directive('validate', ValidateDirective);

    ValidateDirective.$inject = ['rawUI.validation', 'rawUI.inputControls'];

    /* directive */
    function ValidateDirective(validation, controls) {

        /* return */
        return {
            restrict: 'A',
            scope: true,
            link: validateLink
        };

        /* link */
        function validateLink($scope, $elem, $attrs) {
            var handlers = $attrs.validate || 'required',

                // input element
                input = controls.findControl($elem),

                // validation result callback
                resultCallback = function (isValid, failedFor) {
                    $scope.isValid = isValid;
                    $scope.failedFor = failedFor;
                    $elem.toggleClass('invalid', !isValid);
                },

                // registered ID
                id = validation.register(input, handlers,
                    $scope.validateContext || $attrs.validateContext, resultCallback, input.attr('name'));

            // setup scope
            $scope.isValid = true;

            // watch for scope destruction and unregister
            $scope.$on('$destroy', function () {
                validation.unregister(id);
            });

            // realtime validation
            $scope.$watch(function () {
                return controls.getValue(input);
            }, function () {
                // only do realtime validation if already invalid
                !$scope.isValid && validation.validate(id);
            });

            if (input[0].tagName === 'TEXTAREA') {

                // realtime validation for textarea
                input.on('keydown', function () {

                    // only do realtime validation if already invalid
                    !$scope.isValid && validation.validate(id);
                });
            } else if (input.attr('type') === 'checkbox') {

                // click validation
                $elem.on('click', function () {
                    validation.validate(id);
                });
            } else if (input.attr('type') !== 'radio') {

                // blur validation
                input.on('blur', function () {
                    validation.validate(id);
                });
            }
        }
    }
}());


/*
 * DIRECTIVE: (data-no-validate)
 * 
 * Allows specifying under what condition an element is not eligible to be validated.
 * Attribute value is an expression that returns true or false. If true, the element 
 * is not eligable for validation by validation service.
 */
(function () {

    module.directive('noValidate', NoValidateDirective);

    NoValidateDirective.$inject = ['$parse'];

    /* directive */
    function NoValidateDirective($parse) {

        /* return */
        return {
            restrict: 'A',
            scope: false,
            link: noValidateLink
        };

        /* link */
        function noValidateLink($scope, $elem, $attrs) {
            var getter = $parse($attrs.noValidate);

            $scope.$watch(function () {
                return getter($scope);
            }, function (isNotValidated) {
                var isValidated = !isNotValidated;
                $elem.toggleClass('no-validation', !isValidated);
                if (!isValidated) {
                    $elem.removeClass('invalid');
                }
            });
        }
    }
}());
}(window, document));