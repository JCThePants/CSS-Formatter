(function(){
'use strict';
var module = angular.module('rawUI', []),
    ae = angular.element;


/* DIRECTIVE: (<A>) 
 *
 * Prevent clicks on disabled links and links with a hashtag href 
 */
module.directive('a', function () {
    return {
        restrict: 'E',
        link: function (scope, elem, attrs) {
            elem.on('click', function (e) {
                if (elem.hasClass('disabled')) {
                    e.stopImmediatePropagation();
                    return false;
                } else if (attrs['href'] === '#') {
                    e.preventDefault();
                }
            });
        }
    };
});


/* DIRECTIVE (<data-transition-height>) 
 *
 * Use to apply height based CSS transitions from 0px height to unknown/variable height).
 * 
 * The directive attribute value is an expression that indicates if the height should be 'auto'
 * or 0, where true === 'auto' and false === '0px'
 */
module.directive('transitionHeight', ['$parse', 'ruiUtils', function ($parse, utils) {
    return {
        restrict: 'A',
        scope: false,
        link: function (scope, elem, attrs) {
            var el = elem[0],
                getter = attrs.transitionHeight ? $parse(attrs.transitionHeight) : null,
                overflowY, overflowX,
                style = utils.getStyle,
                inProgress,
                isOpen = false,
                update = function (open) {

                    if (inProgress)
                        return;

                    inProgress = true;

                    if (open) {

                        elem.css('height', 'auto');
                        var height = utils.rect(elem).height;
                        elem.css('height', 0);

                        setTimeout(function () {
                            elem.addClass('open').css('height', height !== 'auto' ? height + 'px' : 'auto');
                        }, 1);

                    } else {
                        height = utils.rect(elem).height || 'auto';
                        elem.removeClass('open').css('height', 0);
                    }

                    // wait for animations to stop
                    var prevHeight = utils.rect(elem).height;
                    var interval = setInterval(function () {
                        if (height === 'auto' || prevHeight === utils.rect(elem).height) {
                            inProgress = false;
                            clearInterval(interval);

                            // make sure the curent model value matches the current state.
                            var current = getter(scope);
                            if (open !== current)
                                update(current);
                        }

                        prevHeight = utils.rect(elem).height;
                    }, 50)
                };

            ae(window).on('resize', function () {
                isOpen && elem.css('height', 'auto');
            });

            // watch for changes to scope value
            getter && scope.$watch(function () {
                return getter(scope);
            }, function (val) {
                update(isOpen = val);
            });

            !getter && console.warn('slide-down directive requires a boolean object model');
        }
    };
}]);


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
module.directive('enable', ['$parse', 'ruiUtils', function ($parse, utils) {
    return {
        restrict: 'A',
        scope: false,
        link: function (scope, elem, attrs) {
            if (!attrs.enable) {
                console.warn('enable directive requires an expression to evaluate.')
                return;
            }

            var getter = $parse(attrs.enable);
            
            scope.$watch(function () {
                return getter(scope);
            }, function (isEnabled) {
                if (isEnabled) {
                    utils.disable(elem, false);
                }
                else {
                    utils.disable(elem, true);
                }
            });

        }
    };
}]);


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
module.directive('disable', ['$parse', 'ruiUtils', function ($parse, utils) {
    return {
        restrict: 'A',
        scope: false,
        link: function (scope, elem, attrs) {
            if (!attrs.disable) {
                console.warn('"disable" directive requires an attribute value to evaluate.')
                return;
            }

            var getter = $parse(attrs.disable);
            
            scope.$watch(function () {
                return getter(scope);
            }, function (isDisabled) {
                if (isDisabled) {
                    utils.disable(elem, true);
                }
                else {
                    utils.disable(elem, false);
                }
            });

        }
    };
}]);


/* DIRECTIVE: (data-and) 
 * 
 * Works in conjunction with (data-ng-model). Specifies a condition that must be true in order
 * for the model to be valid. 
 * 
 * The attributes value must evaluate true, otherwise the model value is set to false.
 */
module.directive('and', ['$parse', '$timeout', 'ruiUtils', function ($parse, $timeout, utils) {
    return {
        restrict: 'A',
        require: 'ngModel',
        scope: true,
        link: function (scope, elem, attrs, ngModel) {
            if (!attrs.and) {
                console.warn('"and" directive requires expression to evaluate.');
                return;
            }

            var getter = $parse(attrs.and);

            // watch for changes in attribute evaluation
            scope.$watch(function () {
                return getter(scope);
            }, function (val) {
                if (!val) {
                    if (elem[0].type === 'radio' || elem[0].type === 'checkbox' ||
                        elem[0].hasOwnProperty('checked')) {
                        ngModel.$setViewValue(false);
                        elem[0].checked = false;                        
                    }
                    else {
                        ngModel.$setViewValue('');
                        elem[0].value = '';
                    }
                }
            });
        }
    }
}]);


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
 * You can customize how the value is displayed by providing the '.value' element in advance:
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
    'use strict';

    document.registerElement && document.registerElement('select-box');

    module.directive('selectBox', ['$parse', 'ruiUtils', function ($parse, utils) {

        var index = 200;

        return {
            restrict: 'EAC',
            require: 'ngModel',
            scope: false,
            link: function (scope, elem, attrs, ngModel) {

                var lbl = ae(elem[0].querySelector('.value')),
                    ul = ae(elem[0].querySelector('ul')),
                    li = ae(elem[0].querySelectorAll('ul>li')),
                    doc = ae(document),
                    isOpen = false,
                    selected,
                    close = function () {
                        elem.removeClass('open');
                        doc.unbind('click', close);
                        isOpen = false;
                        setTimeout(function () {
                            ul.css('width', utils.rect(elem).width + 'px');
                        });
                    },
                    open = function () {
                        elem.addClass('open');
                        setTimeout(function () {
                            ul.css('width', utils.rect(elem).width + 'px');
                            doc.bind('click', close);
                        });
                    },
                    setVal = function (value) {
                        selected && selected.removeAttr('data-selected');
                        selected = ae(ul[0].querySelector('li[data-value="' + value + '"]'));

                        if (selected.length !== 0) {
                            lbl.html(selected.html());
                            elem.addClass('has-value')[0].value = value;
                            selected.attr('data-selected', 'true');
                        } else {
                            lbl.text('');
                            elem.removeClass('has-value')[0].value = value;
                        }
                    };
                
                if (ul.length === 0) {
                    console.warn('select-box requires unordered list.')
                    return;
                }

                elem.prepend(ae('<span class="select-button"></span>')).css('z-index', index--);
                lbl.length == 0 && elem.prepend(lbl = ae('<span class="value"></span>'));

                // select box click handler
                elem.on('click', function () {
                    
                    // make sure the box is not disabled.
                    if (elem.hasClass('disabled')) {
                        close();
                        return;
                    }
                    
                    isOpen = !isOpen;
                    isOpen ? open() : close();
                });

                // prevent clicking in drop down from causing double action
                ul.on('click', function (e) {
                    e.stopImmediatePropagation();
                });

                // dropdown item click handler
                li.on('click', function (e) {

                    selected.removeAttr('data-selected');
                    selected = ae(this).attr('data-selected', true);
                    lbl.html(selected.html());

                    attrs.onSelect && $parse(attrs.onSelect)(scope);
                    var value = elem[0].value = selected.attr("data-value") || selected.text();
                    ngModel.$setViewValue(value);
                    elem.addClass('has-value')[0].value = value;
                    elem.triggerHandler('change');
                    close();
                });
                
                // set initial selected value
                setVal(ngModel.$modelValue);
                
                // watch for changes in model
                scope.$watch(function (value) {
                    return ngModel.$modelValue;
                }, function (val) {
                    setVal(val);
                });
            }
        };
    }]);
}());


/* DIRECTIVE: (<slider-box>, data-slider-box, .slider-box)
 * 
 * A custom slider control element for changin numberical values
 * 
 * The basic markup for the element is as follows:
 * 
 *    <slider-box data-ng-model="selectValue"></slider-box>
 *    
 *    
 * After the directive is linked, the previous markup would become:
 * 
 *    <slider-box data-ng-model="selectValue">
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
 * element. This is accomplished by the directive by setting the css 'left' or 'top' property 
 * of the handle, depending on orientation.
 * 
 * The orientation is determine by the track size. If the track is wider than tall, the slider
 * is horizontal, otherwise it is vertical.
 * 
 * For setting active state functionality, the directive will look for an optional child element
 * with the class '.slider-box-edit-button'. If it's found, clicking on it will cause the '.active'
 * class to be added to the slider box. clicking outside the box or completing a handle drag will 
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
 */
(function () {
    'use strict';

    document.registerElement && document.registerElement('slider-box');

    module.directive('sliderBox', ['ruiUtils', function (utils) {
        'use strict';

        var rect = utils.rect,
            horizontal = {
                size: 'width',
                offset: 'left',
                pointer: 'pointerX'
            },
            vertical = {
                size: 'height',
                offset: 'top',
                pointer: 'pointerY'
            },
            offsetFromVal = function (s, val) {
                var o = s.orientation,
                    valRange = s.maxValue - s.minValue,
                    percent = val / valRange,
                    halfHandle = rect(s.handle)[o.size] / 2;
                
                return (rect(s.track)[o.size] * percent) - halfHandle;
            },
            offsetFromPointer = function (s, e) {
                var o = s.orientation;
                
                return (utils[o.pointer](e) - s.handleOffset) - rect(s.track)[o.offset];
            },
            setValue = function (s, offset, setModel) {
                var o = s.orientation,
                    halfHandle = rect(s.handle)[o.size] / 2;

                offset = Math.min(Math.max(offset, -halfHandle), rect(s.track)[o.size] - halfHandle);

                var percent = (offset + halfHandle) / rect(s.track)[o.size],
                    valPercent = o === vertical ? 1 - percent : percent,
                    value = s.minValue + ((s.maxValue - s.minValue) * valPercent);
                
                value = Math.round(value / s.step) * s.step;
                value = Math.round(value * 100) / 100;

                if (setModel) {
                    var handleOffset = (rect(s.track)[o.size] * percent) - halfHandle;
                    s.handle.css(o.offset, handleOffset + 'px');
                    s.model.$setViewValue(value);
                    
                } else {
                    s.handle.css(o.offset, offsetFromVal(s, value) + 'px');
                }
            };


        return {
            restrict: 'EAC',
            require: 'ngModel',
            scope: false,
            link: function (scope, elem, attrs, ngModel) {
                var s = {
                        model: ngModel,
                        minValue: parseFloat(attrs.min) || 0,
                        maxValue: parseFloat(attrs.max) || 100,
                        step: parseFloat(attrs.step) || 1,
                        editBtn: elem[0].querySelector('.slider-box-edit-button'),
                        handle: ae('<div class="slider-box-handle"></div>'),
                        track: ae('<div class="slider-box-track"></div>'),
                        trackContainer: ae('<div class="slider-box-track-container"></div>'),
                        isDragging: false,
                        handleOffset: 0
                    },
                    dragStart = function (e) {
                        if (elem.hasClass('disabled'))
                            return;

                        s.isDragging = true;
                        s.handleOffset = utils[s.orientation.pointer](e) - rect(s.handle)[s.orientation.offset];
                        elem.addClass("dragging");
                    },
                    dragEnd = function (e) {
                        if (!s.isDragging)
                            return;

                        elem.removeClass("dragging active");
                        setTimeout(function () {
                            s.isDragging = false;
                            !elem.hasClass('disabled') && setValue(s, offsetFromVal(s, ngModel.$modelValue));
                        }, 1);
                    },
                    drag = function (e) {
                        if (!s.isDragging || elem.hasClass('disabled'))
                            return;

                        setValue(s, offsetFromPointer(s, e), true);
                    };
                
                // setup optional edit button if present
                if (s.editBtn) {
                    s.editBtn = ae(s.editBtn);
                    s.editBtn.on('click', function (e) {
                        !elem.hasClass('disabled') && elem.addClass('active');
                    });
                    ae(document).on('click', function (e) {
                        if (!elem.hasClass('active') || utils.isClicked(elem, e))
                            return;

                        elem.removeClass('active');
                    });
                    elem.append(s.editBtn);
                }

                // setup elements and orientation
                elem.append(s.trackContainer.append(s.track.append(s.handle)));
                s.orientation = rect(s.track).width > rect(s.track).height ? horizontal : vertical;

                // track click
                s.track.on('click', function (e) {
                    utils.stopEvent(e);
                    if (s.isDragging || elem.hasClass('disabled'))
                        return;

                    s.handleOffset = 0;
                    setValue(s, offsetFromPointer(s, e), true);
                });

                // drag start
                s.handle
                    .on('mousedown', dragStart)
                    .on('touchstart', dragStart);

                // drag handle release
                ae(document)
                    .on('mouseup', dragEnd)
                    .on('touchend', dragEnd);

                // drag handle move
                ae(document)
                    .on('mousemove', drag)
                    .on('touchmove', drag);

                // watch for model change
                scope.$watch(function () {
                    return ngModel.$modelValue;
                }, function (val) {
                    !s.isDragging && setValue(s, offsetFromVal(s, val));
                });
            }
        };
    }]);

}());


/* DIRECTIVE: (<data-toggle>) 
 *
 * Add to an element to make it a button that toggles a value between true
 * and false.
 * 
 * The directives attribute value should point to the scope variable 
 * that should be toggled.
 * 
 * When the toggled to a value of true, the '.active' class is added
 * to the element.
 *
 * If the '.disabled' class is added to the element, the toggle will
 * stop functioning.
 */
module.directive('toggle', ['$timeout', '$parse', function ($timeout, $parse) {
    return {
        restrict: 'A',
        scope: false,
        link: function (scope, elem, attrs) {
            var getter = $parse(attrs.toggle);

            elem.on('click', function (e) {
                e.preventDefault();
                
                if (elem.hasClass('disabled'))
                    return;
                
                $timeout(function () {
                    var toggle = !getter(scope);
                    getter.assign(scope, toggle);
                    elem[toggle ? 'addClass' : 'removeClass']('active');
                });
            });
        }
    };
}]);


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
module.directive('popupBox', ['popups', function (popups) {
    return {
        restrict: 'EAC',
        link: function (scope, elem, attrs) {
            elem.prop('isPopupElement', true)
                .on('click', function (e) {
                    if (!attrs.id) {
                        console.warn('popup-box directive requires ID attribute.');
                        return;
                    }

                    var el = e.target;

                    while (el) {
                        if (el === elem[0]) {
                            break;
                        }

                        // determine if click came from popup element
                        if (popups.isPopupElement(el))
                            return;

                        el = el.parentElement;
                    }

                    // click came from this element or a child that is not a popup, close all child popups
                    popups.closeChildren(attrs.id);
                });
        }
    };
}]);


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
module.directive('popupButton', ['ruiUtils', 'popups', function (utils, popups) {
    var isDefined = utils.isDefined;
    return {
        restrict: 'A',
        link: function (scope, elem, attrs) {
            var id = attrs.popupButton;
            if (!id) {
                console.warn('popup-button directive requires attribute value to point to popup box ID attribute.');
                return;
            }

            elem.prop('isPopupElement', true)
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
                    el = elem[0];
                    while (el) {
                        ael = ae(el);
                        
                        // make sure the button is not disabled.
                        if (ael.hasClass('disabled'))
                            return;
                        
                        // check if the button is also the popup box
                        if (isDefined(ael.attr('data-popup-box'))) {
                            popups.keepOpen.push({
                                id: el.id,
                                parentId: id
                            });
                        }
                        el = el.parentElement;
                    }
                
                    e.stopPropagation();
                
                    // toggle popup
                    popups.toggle(id);
                });
        }
    };
}]);


/* FACTORY: popups
 * 
 * Handles all popup states.
 */
module.factory('popups', ['ruiUtils', function (utils) {

    var factory,
        isDefined = utils.isDefined,
        keepOpen = [],
        states = {},
        
        // determine if a popup should not be closed via 'closeAll' function
        shouldKeepOpen = function (id) {
            for (var i = 0, item; item = keepOpen[i]; i++) {
                if (item.id === id)
                    return true;
            }
            return false;            
        },
        
        // Close all popups. 
        // Optionally provide the id of the popup to exclude from closing.
        // Does not close popups in 'keepOpen' array unless force arg is true.
        // 'keepOpen array is cleared after call.
        closeAll = function (except, force) {
            for (var id in states) {
                if (id === except || (!force && shouldKeepOpen(id)))
                    continue;

                update(id, false);
            }
            keepOpen.length = 0;
        },
            
        // update a popups visible state
        update = function (id, isOpen) {
            states[id] = isOpen;
            var box = ae(document.getElementById(id));
            box[isOpen ? 'addClass' : 'removeClass']('open');
            return isOpen;
        };


    // close popup if clicking outside of box
    window.addEventListener('click', function (e) {
        var el = e.target;
        while (el) {

            // determine if click came from popup element
            if (factory.isPopup(el)) {
                return;
            }
            el = el.parentElement;
        }
        closeAll(null, true);
    });

    return factory = {

        /**
         * Toggle popup box open state.
         * 
         * @param   {string}  id  The ID of the popup box.
         *
         * @returns {boolean}  The new state of the box.
         */
        toggle: function (id) {
            closeAll(id);
            return update(id, !states[id]);
        },

        /**
         * Close popup box.
         * 
         * @param {string}  id  The ID of the popup box.
         */
        close: function (id) {
            factory.update(id, false);
        },
        
        /**
         * Close all popups that were opened within the specified parent popup box.
         * 
         * @param {string}  parentId  The ID of the parent popup box.
         */
        closeChildren: function (parentId) {
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
                        factory.close(id);
                        break;
                    }
                    el = el.parentElement;
                }
            }
        },
        
        /**
         * Determine if a popup is open.
         * 
         * @param   {string}  id  The ID of the popup.
         *                        
         * @returns {boolean}
         */
        isOpen: function (id) {
            return states[id];
        },

        /**
         * Determine if an element is a popup box or button.
         * 
         * @param   {Element}  el  An angular or dom element to check.
         *                         
         * @returns {boolean}
         */
        isPopup: function (el) {
            return ae(el[0] || el).prop('isPopupElement');
        }
    };
}]);


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

    module.directive('calendarBox', ['$compile', '$parse', 'ruiCalendarView', 'ruiUtils', function ($compile, $parse, calendarView, utils) {

        return {
            restrict: 'EAC',
            require: '^ngModel',
            scope: true,
            link: function (scope, elem, attrs, ngModel) {

                var trackTime = utils.isDefined(attrs.trackTime),
                    isReadOnly = utils.isDefined(attrs.readOnly),
                    isSyncView = utils.isDefined(attrs.syncView),
                    isMultiSelect = utils.isDefined(attrs.multiSelect),
                    now = new Date(),
                    calendar,
                    yearRadius = utils.numberGetter(scope, attrs.yearRadius, 20),
                    minYear = utils.numberGetter(scope, attrs.minYear, now.getFullYear() - yearRadius.val),
                    maxYear = utils.numberGetter(scope, attrs.maxYear, now.getFullYear() + yearRadius.val),
                    year = utils.numberGetter(scope, attrs.year, now.getFullYear()),
                    month = utils.numberGetter(scope, attrs.month, now.getMonth() + 1);
                    
                scope.calendar = calendar = calendarView.createView(ngModel, {
                    isSyncView: isSyncView,
                    isMultiSelect: isMultiSelect,
                    yearRadius: yearRadius.val,
                    minYear: minYear.val,
                    maxYear: maxYear.val,
                    year: year.val,
                    month: month.val
                });

                scope.calendarData = calendar.data;
                scope.yearRadius = yearRadius.val;
                scope.minYear = minYear.val;
                scope.maxYear = maxYear.val;
                
                scope.select = function (data, e) {
                    e && e.preventDefault();
                    calendar.addSelected(calendarView.convertOut(data), true);
                };

                scope.showSelected = function (e) {
                    e && e.preventDefault();
                    calendar.showSelected();
                };

                scope.year = String(calendar.year());
                scope.month = String(calendar.month());

                var container = ae(elem[0].querySelector('.calendar') || '<div class="calendar"></div>'),
                    day = (function () {
                        if (isReadOnly)
                            return '<span ng-class="{hidden:!day.date}">{{day.day}}</a>';
                        return '<a href="#" ng-class="{hidden:!day.year}" ng-click="select(day, $event)">{{day.day}}</a>'
                    }()),
                    weekRows = ae($compile((function () {
                        var html = '<div class="calendar-week" ng-repeat="row in calendarData()">';
                        html += '<span class="calendar-day" ng-repeat="day in row" ng-class="{selected:day.selected,disabled:day.disabled}">';
                        html += day;
                        html += '</span></div>';
                        return html;
                    }()))(scope));

                // setup calendar header
                (function () {
                    var header = ae(elem[0].querySelector('.calendar-header')),
                        dayLen = Math.max(1, Math.min(3, parseInt(attrs.dayLen) || 2))

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

                elem.append(container.append(weekRows));

                scope.$watch('year', function (year) {
                    calendar.year(year);
                });

                scope.$watch('month', function (month) {
                    calendar.month(month);
                });

                scope.$watch('calendar.year()', function (year) {
                    scope.year = String(year);
                });

                scope.$watch('calendar.month()', function (month) {
                    scope.month = String(month);
                });

                scope.$watchCollection(function () {
                    return ngModel.$modelValue;
                }, function (val) {
                    elem[0].value = val;
                    calendar.updateData();
                });
                
                if (yearRadius.getter) {
                    scope.$watch(function () {
                        return yearRadius.getter(scope);
                    }, function (val) {
                        var now = new Date();
                        var i = parseInt(val);;
                        scope.yearRadius = i;
                        scope.minYear = now.getFullYear() - i;
                        scope.maxYear = now.getFullYear() + i;
                        calendar.yearRadius(i);
                    });
                }
                
                if (year.getter) {
                    scope.$watch(function () {
                        return year.getter(scope);
                    }, function (val) {
                        var i = parseInt(val);
                        scope.year = i;
                        calendar.year(i);
                    });
                }

                if (month.getter) {
                    scope.$watch(function () {
                        return month.getter(scope);
                    }, function (val) {
                        var i = parseInt(val);
                        scope.month = i;
                        calendar.month(i);
                    });
                }
                
                if (maxYear.getter) {
                    scope.$watch(function () {
                        return maxYear.getter(scope);
                    }, function (val) {
                        var i = parseInt(val);
                        scope.maxYear = i;
                        calendar.maxYear(i);
                    });
                }
            }
        }
    }]);
}());


/*
 * SERVICE: calendar
 * 
 * Provides calendar functionality.
 */
module.service('ruiCalendarView', ['ruiUtils', 'ruiDateUtils', function (utils, dateUtils) {

    var service = this,
        defConversionOut = function (year, month, day) {
            return new Date(year, month - 1, day);
        },
        defConversionIn = function (item) {
            if (item) {
                if (utils.isProto(item, '[object Date]')) {
                    return item;
                }

                if (utils.is(item, 'string') || utils.is(item, 'number')) {
                    return new Date(item);
                }
            }
            return null;
        },
        comparer = function (a, b) {
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

            return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate();
        },
        conversionOut = defConversionOut,
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
     * Set the conversion callback use to convert a year, month, and day into 
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
     * The value the callback returns is used to replace the previous value.
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
     * Set the conversion callback used to convert objects used to represent the date to
     * Date objects.
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

    /**
     * Create an array of years from a minimum year to
     * a maximum year.
     *
     * @param   {number}  min  The minimum year.
     * @param   {number}  max  The maximum year.
     *
     * @returns {Array}  Array of numbers.
     */
    this.createYearArray = function (min, max) {
        var array = [];
        for (var i = min; i <= max; i++) {
            array.push(i);
        }
        return array;
    };

    /**
     * Create a CalendarView instance.
     * 
     * @returns {CalendarView}
     */
    this.createView = function (ngModelCtrl, options) {

        if (!ngModelCtrl)
            throw 'ngModel is require to create a CalendarView instance.';

        return new function () {
            var now = new Date(),
                currYear = now.getFullYear(),
                self = this;

            this._year = now.getFullYear();
            this._month = now.getMonth() + 1;
            this._minYear = currYear - 25;
            this._maxYear = currYear + 25;
            this._yearArray;
            this._monthData;
            this._itemName;
            this._multiSelect = options && options.isMultiSelect && !options.isSyncView;
            this._sync = options && options.isSyncView;

            if (options) {

                if (options.isSyncView && options.isMultiSelect)
                    throw 'CalendarView cannot be both sync-view and multi-select.';
                
                if (options.year) {
                    this._year = parseInt(options.year) || this._year;
                }

                if (utils.isDefined(options.month)) {
                    this._month = parseInt(options.month) || this._month;
                }

                var radius = parseInt(options.yearRadius);
                if (radius) {
                    this._minYear = currYear - radius;
                    this._maxYear = currYear + radius;
                }

                this._minYear = parseInt(options.minYear) || this._minYear;
                this._maxYear = parseInt(options.maxYear) || this._maxYear;
            }

            this._yearArray = service.createYearArray(self._minYear, self._maxYear);

            // synchronize calendar with model
            function syncModel(mods) {
                var date = self.getSelectedDate();
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

            /**
             * Set the name of the property to check for date value in objects used to determine
             * selected dates.
             * 
             * @param   {string} [itemName]  The property name. Omit to get current value.
             *                             
             * @returns {string|this}
             */
            this.itemName = function (itemName) {
                if (!utils.isDefined(itemName))
                    return self._itemName;

                self._itemName = itemName;
            };

            /**
             * Set calendar view year and month using Date.
             * 
             * @param   {Date}  date  The date.
             *                        
             * @returns {this}
             */
            this.setDate = function (date) {
                date = dateUtils.parseDate(date);
                if (date) {
                    self.setView(date.getFullYear(), date.getMonth() + 1);
                }
                return self;
            };

            /**
             * Set calendar view year and month.
             * 
             * @param {number}  year   The year.
             * @param {number}  month  The 1 based month value.
             */
            this.setView = function (year, month) {

                this._year = parseInt(year);
                this._month = parseInt(month);

                if (self._sync) {
                    syncModel({
                        year: date.getFullYear(),
                        month: date.getMonth(),
                        day: date.getDate()
                    });
                }

                self.updateData();
                return self;
            };

            /**
             * Get or set the full year.
             * 
             * @param  {number}  [year]  The year to set. Omit to get current year.
             *                            
             * @returns {number|null|this}  Always returns value even if date is set to null.
             */
            this.year = function (year) {
                if (!utils.isDefined(year))
                    return self._year;

                if (self.isValidYear(year)) {
                    self._year = parseInt(year);

                    // synchronize calendar with model
                    if (self._sync) {
                        syncModel({
                            year: self._year
                        });
                    }

                    utils.triggerUpdate(function () {
                        self.updateData();
                    });
                }

                return self;
            };

            /**
             * Get or set month.
             * 
             * The month is 1 based, not 0 based like the javascript Date object.
             * 
             * @param {number}  [month]  The month. Omit to get current month.
             *
             * @returns {number|this}  Always returns value even if date is set to null.
             */
            this.month = function (month) {
                if (!utils.isDefined(month))
                    return self._month;

                self._month = parseInt(month) || self._month;

                // synchronize calendar with model
                if (self._sync) {
                    syncModel({
                        month: self._month
                    });
                }

                utils.triggerUpdate(function () {
                    self.updateData();
                });
                return self;
            };

            /**
             * Determine if a year is in valid view range.
             * 
             * @param   {number} year  The year to check.
             *
             * @returns {boolean}
             */
            this.isValidYear = function (year) {
                year = parseInt(year) || 0;

                return year >= self._minYear && year <= self._maxYear;
            };


            /**
             * Get or set minimum calendar year.
             * 
             * @param {number}  [year]  The minimum year. Omit to get current value.
             *
             * @return {number|this}
             */
            this.minYear = function (year) {
                if (!utils.isDefined(year))
                    return self._minYear;

                self._minYear = parseInt(year) || self._minYear;
                self._yearArray = service.createYearArray(self._minYear, self._maxYear);

                return self;
            };

            /**
             * Get or set maximum calendar year.
             *
             * @param {number}  [year]  The minimum year. Omit to get current value.
             *
             * @return {number|this}
             */
            this.maxYear = function (year) {
                if (!utils.isDefined(year))
                    return self._maxYear;

                self._maxYear = parseInt(year) || self._maxYear;
                self._yearArray = service.createYearArray(self._minYear, self._maxYear);

                return self;
            };

            /**
             * Get or set the radius range of the year.
             * 
             * The result is minYear = currentYear - radius
             * and maxYear = currentYear + radius.
             * 
             * Getting radius when min and max do not have an equal radius
             * will return the smaller of the two values.
             * 
             * @param {number}  [radius]  The year radius. Omit to get current value.
             */
            this.yearRadius = function (radius) {
                if (!utils.isDefined(radius))
                    return Math.min(self._minYear, self._maxYear);

                self.minYear(currYear - radius);
                self.maxYear(currYear + radius);
                self._yearArray = service.createYearArray(self._minYear, self._maxYear);

                return self;
            };

            /**
             * Get an array of years spanning from the minimum year value to the
             * maximum value.
             * 
             * @returns {Array} Array of numbers.
             */
            this.yearRange = function () {
                return self._yearArray;
            };

            /**
             * Add a specified number of years to the current value.
             * 
             * @param {number} years  The number of years to add. Can be negative.
             */
            this.addYears = function (years) {
                var y = self._year + parseInt(years);
                if (!self.isValidYear(y))
                    return;

                self._year = y;

                // synchronize calendar with model
                if (self._sync) {
                    syncModel({
                        year: y
                    });
                }

                utils.triggerUpdate(function () {
                    self.updateData();
                });
            };

            /**
             * Add a specified number of months to the current value.
             * 
             * @param {number} months  The number of months to add. Can be negative.
             */
            this.addMonths = function (months) {
                var year = self._year,
                    month = self._month + parseInt(months);

                while (month <= 0) {
                    year--;
                    month = 12 + month;

                    if (!self.isValidYear(year))
                        return;
                }

                var date = new Date(year, month - 1, 1);
                self._year = date.getFullYear();
                self._month = date.getMonth() + 1;

                // synchronize calendar with model
                if (self._sync) {
                    syncModel({
                        year: self._year,
                        month: self._month
                    });
                }

                utils.triggerUpdate(function () {
                    self.updateData();
                });
            };

            /**
             * Update calendar data.
             */
            this.updateData = function () {

                var year = self.year(),
                    month = self.month(),
                    first = new Date(year, month - 1, 1),
                    firstDay = first.getDay(),
                    total = dateUtils.daysInMonth(year, month),
                    totalRows = Math.ceil(total / 7),
                    data = [],
                    dayCount = 0,
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
                        values = self.getSelectedItems(year, month, day);

                    row.push({
                        year: year,
                        month: month,
                        day: day,
                        selected: values.length > 0,
                        values: values
                    });
                }

                self._monthData = data;
                utils.triggerUpdate();
            };

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
            this.data = function () {
                return self._monthData;
            };

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
            this.getSelectedItems = function (year, month, day) {

                var result = [];

                if (!ngModelCtrl.$modelValue)
                    return result;

                var selected = ngModelCtrl.$modelValue instanceof Array ? ngModelCtrl.$modelValue : [ngModelCtrl.$modelValue];

                for (var i = 0, item; i < selected.length; i++) {
                    item = selected[i];

                    if (!item)
                        continue;

                    item = self._itemName ? selected[i][self._itemName] : selected[i];

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
            };

            /**
             * Get the selected date(s) as Date object(s).
             * 
             * @returns {Date|Array|null}  Date or null for single select, Array of Date for multi select mode.
             */
            this.getSelectedDate = function () {

                // multi select
                if (self._multiSelect) {
                    var result = [],
                        selected = ngModelCtrl.$modelValue instanceof Array ? ngModelCtrl.$modelValue : [ngModelCtrl.$modelValue];

                    for (var i = 0, item; i < selected.length; i++) {
                        item = selected[i];

                        if (!item) continue;

                        item = self._itemName ? selected[i][self._itemName] : selected[i];

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
            };

            /**
             * Add a selected item or Array of selected items.
             * 
             * If the calendar is not multi select, all existing values are
             * cleared.
             * 
             * @param {Array|?}  item    Date value object or Array of date value objects.
             * @param {boolean}  toggle  If true and the item is already added, the item is removed.
             */
            this.addSelected = function (item, toggle) {

                if (!self._multiSelect) {
                    self.setSelected(item);
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
                        self.updateData();
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
                self.updateData();
            };

            /**
             * Set the selected item or Array of selected items.
             * 
             * If the calendar is not multi select and an array is provided, only
             * the first item is used.
             * 
             * @param {?} item  Date value object or Array of date value objects.
             */
            this.setSelected = function (item) {

                if (self._multiSelect) {
                    var array = [];
                    if (item instanceof array) {
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
                self.updateData();
            };

            /**
             * Remove an item or array of items from the selected items.
             * 
             * @param {Array|object}  item  The item or items to remove.
             */
            this.removeSelected = function (item) {

                if (ngModelCtrl.$modelValue instanceof Array) {
                    utils.spliceAll(ngModelCtrl.$modelValue, item);
                } else if (ngModelCtrl.$modelValue === item ||
                    (item instanceof Array && utils.arrayContains(item, ngModelCtrl.$modelValue, comparer))) {
                    ngModelCtrl.$setViewValue(null);
                }
                self.updateData();
            };

            /**
             * Clear all selected values.
             */
            this.clearSelected = function () {
                ngModelCtrl.$setViewValue(self._multiSelect ? [] : null);
                self.updateData();
            };

            /**
             * Changes the calendar view to show the closest selected value.
             */
            this.showSelected = function () {

                // sync view always has selected value in view
                if (self._sync)
                    return;

                // see if there are already selected items in view
                var selected = self.getSelectedItems(self._year, self._month);
                if (selected.length)
                    return;

                selected = self.getSelectedItems();

                // sort by dates closest to current view year and month
                selected.sort(function (a, b) {
                    var dateA = service.convertIn(a);
                    var dateB = service.convertIn(b);

                    if (!dateA && dateB)
                        return 1;
                    if (!dateB && dateA)
                        return -1;
                    if (!dateA && !dateB)
                        return 0;

                    var result = 0;
                    result -= (Math.abs(dateA.getFullYear() - self._year) * 12) + Math.abs(dateA.getMonth() + 1 - self._month);
                    result += (Math.abs(dateB.getFullYear() - self._year) * 12) + Math.abs(dateB.getMonth() + 1 - self._month);
                    return result;
                });

                var date = selected.pop();
                if (date) {
                    self.setView(date.getFullYear(), date.getMonth() + 1);
                }
            };
        };
    };

}]);


/*
 * SERVICE: dateUtils
 * 
 * Provides date manipulation utilities.
 */
module.service('ruiDateUtils', ['ruiUtils', function (utils) {

    var service = this;

    /**
     * Parse a potential date value into a Date object.
     * 
     * @param   {object}  date  The potential date value to parse.
     *                          
     * @returns {Date|null}
     */
    this.parseDate = function (date) {

        if (date) {
            if (utils.isProto(date, '[object Date]')) {
                return date;
            }

            if (utils.is(date, 'string') || utils.is(date, 'number')) {
                return new Date(date);
            }
        }
        return null;
    };

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
    this.daysInMonth = function (year, month) {
        if (utils.isDefined(year))
            return new Date(parseInt(year), parseInt(month), 0).getDate();

        var now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    };

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
    this.modifyDate = function (date, mods) {

        var year = parseInt(mods.year) || date.getFullYear(),
            month = parseInt(mods.month) || date.getMonth() + 1,
            day = parseInt(mods.day) || date.getDate(),
            hours = parseInt(mods.hours),
            minutes = parseInt(mods.minutes),
            seconds = parseInt(mods.seconds),
            milliseconds = parseInt(mods.milliseconds);

        hours = isNaN(hours) ? date.getHours() : hours;
        minutes = isNaN(minutes) ? date.getMinutes() : minutes;
        seconds = isNaN(seconds) ? date.getSeconds() : seconds;
        milliseconds = isNaN(milliseconds) ? date.getMilliseconds() : milliseconds;

        return new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);
    };


    /**
     * Create a new Date object from the supplied Date object and add the
     * specified number of years.
     *
     * @param {Date}    date   The source date.
     * @param {number}  years  The number of years to add. Can be negative.
     */
    this.addYears = function (date, years) {
        return service.modifyDate(date, {
            year: date.getFullYear() + years
        });
    };

    /**
     * Create a new Date object from the supplied Date object and add the
     * specified number of months.
     *
     * @param {Date}    date    The source date.
     * @param {number}  months  The number of months to add. Can be negative.
     */
    this.addMonths = function (date, months) {
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
    };

    /**
     * Create a new Date object from the specified Date object and add the
     * specified number of days.
     *
     * @param {Date}    date   The source date.
     * @param {number}  days   The number of days to add. Can be negative.
     */
    this.addDays = function (date, days) {
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
    };

    /**
     * Create a new Date object from the supplied Date object and add the
     * specified number of hours.
     *
     * @param {Date}    date   The source date.
     * @param {number}  hours  The number of hours to add. Can be negative.
     */
    this.addHours = function (date, hours) {
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
    };

    /**
     * Create a new Date object from the supplied Date object and add the
     * specified number of minutes.
     *
     * @param {Date}    date     The source date.
     * @param {number}  minutes  The number of minutes to add. Can be negative.
     */
    this.addMinutes = function (date, minutes) {

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
                    day = service.getDaysInMonth(year, month) + day;
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
    };

    /**
     * Create a new Date object from the supplied Date object and add the
     * specified number of seconds.
     *
     * @param {Date}    date     The source date.
     * @param {number}  seconds  The number of seconds to add. Can be negative.
     */
    this.addSeconds = function (date, seconds) {

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
    };

}]);


/* SERVICE: ui-utils
 * 
 * General utility functions.
 */
module.service('ruiUtils', ['$timeout', '$parse', function ($timeout, $parse) {

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
        };

    /**
     * Get computed style of an element.
     * 
     * @param   {Element} el   Angular or dom element to check.
     * @param   {string} rule  The name of the CSS rule to check.
     *                         
     * @returns {string} The CSS value of the specified rule.
     */
    this.getStyle = function (el, rule) {
        el = el[0] || el;
        if (document.defaultView && document.defaultView.getComputedStyle) {
            return document.defaultView.getComputedStyle(el, '').getPropertyValue(rule);
        } else if (el.currentStyle) {
            rule = rule.replace(/\-(\w)/g, function (str, c) {
                return c.toUpperCase();
            });
            return el.currentStyle[rule];
        }
        return '';
    };

    /**
     * Provides shorter syntax for getting an elements
     * bounding client rectangle.
     * 
     * @param   {Element}  el  Angular or dom element.
     *                         
     * @returns {object}  The bounding client rectangle.
     */
    this.rect = function (el) {
        return (el[0] || el).getBoundingClientRect();
    };

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
    this.disable = function (elem, isDisabled) {
        elem = elem[0] || elem;

        var controls = ae(elem.querySelectorAll('input,a,select,textarea,button,label'));
        controls.push(elem);

        if (isDisabled) {
            controls.attr('disabled', 'disabled').on('click', service.stopEvent);
        } else {
            controls.removeAttr('disabled').off('click', service.stopEvent);
        }
        ae(elem)[isDisabled ? 'addClass' : 'removeClass']('disabled')[0].disabkled = isDisabled;
    };

    /**
     * Determine if an element was clicked by searching for it 
     * from a mouse event target element up to the root parent.
     * 
     * @param   {Element} elem  Angular or dom element.
     * @param   {Event}   e     The event.
     *                          
     * @returns {boolean}
     */
    this.isClicked = function (elem, e) {
        var el = e.target;
        while (el) {
            if (el === (elem[0] || elem))
                return true;
            el = el.parentNode;
        }
        return false;
    };

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
        el = ae(el[0] || el);
        return service.isDefined(el.attr(name)) || service.isDefined(el.attr('data-' + name));
    };

    /**
     * Get pointer X position from mouse or touch event.
     * 
     * @param {MouseEvent|TouchEvent} e  Mouse or touch event.
     *                                   
     * @return {number}
     */
    this.pointerX = function (e) {
        return (e.touches ? e.touches[0].clientX : e.pageX) || 0;
    };

    /**
     * Get pointer Y position from mouse or touch event.
     * 
     * @param {MouseEvent|TouchEvent} e  Mouse or touch event.
     *                                   
     * @return {number}
     */
    this.pointerY = function (e) {
        return (e.touches ? e.touches[0].clientY : e.pageY) || 0;
    };

    /**
     * Parse a value that is meant to be a boolean.
     * 
     * @param {object} b  The boolean value.
     *                    
     * @return {boolean}
     */
    this.parseBool = function (b) {
        if (service.is(b, 'string')) {
            b = b.toLowerCase();
            return b !== '' && b !== 'false' && b !== 'no' && b !== 'off';
        }
        return b ? true : false;
    };

    /**
     * Trigger angular update.
     */
    this.triggerUpdate = function (callback) {
        
        if (callback)
            updateData.callbacks.push(callback);
        
        if (updateData.promise)
            return;

        updateData.promise = $timeout(updateData.callback);
    };

    /**
     * Attempt to get a property from an object. If that fails, the
     * default value is returned.
     * 
     * Failure can be caused by null or undefined object or the property
     * returning a false value.
     * 
     * @param   {object}  obj       The object to check a property in.
     * @param   {string}  propName  The name of the property to check.
     * @param   {object}  defValue  The fallback value.
     *                              
     * @returns {object}
     */
    this.orVal = function (obj, propName, defValue) {
        if (!obj || !obj[propName])
            return defValue;

        return obj[propName];
    };

    /**
     * Attempt to get an integer property from an object. If that fails, the
     * default value is returned.
     * 
     * Failure can be caused by null or undefined object or the property
     * value failing to be parsed as an integer.
     * 
     * @param   {object}  obj       The object to check a property in.
     * @param   {string}  propName  The name of the property to check.
     * @param   {object}  defValue  The fallback value.
     *                              
     * @returns {number}
     */
    this.orInt = function (obj, propName, defValue) {
        if (!obj)
            return defValue;

        var val = parseInt(obj[propName]);
        return isNaN(val) ? defValue : val;
    };

    /**
     * Attempt to get a boolean property from an object.
     * 
     * @param   {object}  obj       The object to check a property in.
     * @param   {string}  propName  The name of the property to check.
     * @param   {object}  defValue  The fallback value.
     *                              
     * @returns {boolean}
     */
    this.orBool = function (obj, propName) {
        return obj && service.parseBool(obj[propName]);
    };

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
    this.spliceAll = function (array, items, comparer) {
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
    };
    
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
    this.arrayContains = function (array, items, comparer) {
        items = items instanceof Array ? items : [items];
        for (var i = 0; i < array.length; i++) {
            for (var j = 0; j < items.length; j++) {
                if ((comparer && comparer(array[i], items[j])) || array[i] === items[j]) {
                    return true;
                }
            }
        }
        return false;
    };
    
    /**
     * Get an object with a value and/or $parse getter from an attribute value that
     * might be a number or an expression to evaluate.
     * 
     * @param   {$Scope}  scope   Angular scope to evaluate expressions in.
     * @param   {string}  attr    Attribute value.
     * @param   {?}       defVal  The default value to use.
     *                            
     * @returns {object}
     */
    this.numberGetter = function (scope, attr, defVal) {
        var result = {
            val: defVal,
            getter: null
        };
        
        if (!service.isDefined(attr))
            return result;
            
        var val = parseInt(attr);
        if (!isNaN(val)) {
            result.val = val;
            return result;
        }
        
        if (attr) {
            result.getter = $parse(attr);
            result.val = result.getter(scope);
        }
        
        return result;
    };
}]);
}());