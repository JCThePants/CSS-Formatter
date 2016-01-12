(function(){
var module = angular.module('css-format', []);


module.factory('CSSComment', ['CSSUtils', function (CSSUtils) {

    /**
     * CSS comment data object.
     * 
     * @param {string} comment  Optional. The comment string.
     */
    function CSSComment(comment, type) {
        this.raw = comment || '';
        this.trimmed = this.raw.trim();
        this.start = 0;
        this.end = 0;
        this.type = type || 'selector';
    }

    /**
     * Get the comment as a CSS string.
     */
    CSSComment.prototype.toString = function () {
        return this.trimmed;
    };

    // return class
    return CSSComment
}]);


 module.factory('CSSFormatter', ['CSSLine', 'CSSComment', 'CSSParentSelector', 'CSSProperty', 'CSSSelectors', 'CSSUtils', 
                                    function (CSSLine, CSSComment, CSSParentSelector, CSSProperty, CSSSelectors, CSSUtils) {

        /**
         * Generates formatted CSS in objects each representing a single
         * line in the output stylesheet.
         * 
         * @param {CSSParser} parser        The CSS Parser to use.
         * @param {object}    [options={}]  Optional configuration. See defaultOptions function source for documentation.
         */
        function CSSFormatter(parser, options) {
            options = options || {};

            this._parser = parser;
            this._options = angular.merge(this.defaultOptions(), options);
            this._lines = this.generateLines();
        }

        /**
         * Get a new object filled with default options.
         * 
         * @returns {object}
         */
        CSSFormatter.defaultOptions = function () {
            return {
                indent: 4,                      // the number of spaces in a single indent.
                selectors: {
                    newLine: true,              // true to start selectors on a new line
                    linesBefore: 0,             // the number of lines to put before the selector
                    linesBeforeComment: 0,      // If the selector is after a comment, the number of lines before the selector and after the comment.
                    maxLength: 90,              // Max length of multiple selectors on a line in characters.
                    forcePerLine: false,        // if true, always writes multi selectors each on a new line
                    combinatedPerLine: true,    // if true, combined selectors in multi selectors are each on their own line
                    linesBeforeMulti: 0,        // extra lines to before multi selectors, if less than linesBefore, linesBefore is used.
                    multispace: 1               // spaces between individual selectors in multi selectors,
                },
                braces: {
                    openNewLine: false,         // If true, the opening brace is placed on a new line,
                    openIndent: 1,              // The number of spaces before an opening brace.
                    openIndentAfter: 0,         // The number of spaces after an opening brace.
                    closeNewLine: true,         // If true, the closing brace is placed on a new line
                    closeIndent: 0,             // The number of spaces before a closing brace.
                    closeIndentAfter: 0,        // The number of spaces after a clsoing brace.
                },
                property: {
                    newLine: true,              // True to place properties each on its own line
                    spaceBetween: 1,            // the number of spaces between the property and its value;
                    closeLast: true,            // if true, adds a semicolon at the end of the last property
                    indentAfter: 0,             // the number of spaces after a property
                },
                comments: {
                    render: true,               // true to render comments
                    renderProperty: true,       // true to render comments between properties
                    renderPropertyInline: true, // true to render comments that are inline with properties
                    linesBefore: 2,             // the number of lines before a selector comment
                    linesAfter: 0,              // the number of lines after a selector comment
                    inlineSpace: 1              // the number of spaces between property and inline comment
                }
            };
        };

        /**
         * Get a new object filled with default options.
         * 
         * @returns {object}
         */
        CSSFormatter.prototype.defaultOptions = function () {
            return CSSFormatter.defaultOptions();
        };

        /**
         * Get generated lines.
         * 
         * @returns {Array} Array of CSSLine
         */
        CSSFormatter.prototype.getLines = function () {
            return this._lines;
        };

        /**
         * Generate formatted stylesheet as line objects and optionally output
         * directly into a specified array.
         * 
         * @param   {Array} [outputArray] Array to output line objects into.
         * 
         * @returns {Array} An array of generated line objects.
         */
        CSSFormatter.prototype.generateLines = function () {
            var parser = this._parser,
                entities = parser.getSelectors(),
                state = new CSSFormatState();

            for (var i = 0, prev, entity; entity = entities[i]; i++) {

                if (entity instanceof CSSComment) {
                    this.generateComment(entity, 0, state);
                } else if (entity instanceof CSSParentSelector) {
                    this.generateParentSelectors(entity, prev && prev instanceof CSSComment, 0, state);
                } else if (entity instanceof CSSSelectors) {
                    this.generateSelectors(entity, prev && prev instanceof CSSComment, 0, state);
                    this.generateProperties(entity, 0, state);
                }

                prev = entity;
            }

            state.newLine(0);
            return state.lines;
        };

        /**
         * Format and output comment line object.
         * 
         * @param   {CSSComment}      comment  The comment object to format.
         * @param   {number}          indent   The indent depth of the comment.
         * @param   {CSSFormatState}  state    The formatter state.
         */
        CSSFormatter.prototype.generateComment = function (comment, indent, state) {
            var copts = this._options.comments;

            if (!copts.render)
                return;

            if (state.hasLines()) {
                state.newLine(indent);
                this.addEmptyLines(copts.linesBefore, indent, state);
            }

            var commentLines = comment.toString().split('\n');
            for (var i = 0, last = commentLines.length - 1, line; line = commentLines[i]; i++) {
                state.current.push(new CSSComment(line));
                if (i !== last)
                    state.newLine(indent);
            }

            this.addEmptyLines(copts.linesAfter, indent, state);
        };

        /**
         * Format and output parent selector line object.
         * 
         * @param {object}           parent          The parent CSS element.
         * @param {boolean}          isAfterComment  True if the selector is after a comment.
         * @param {number}           indent          The indent depth of the selector.
         * @param {CSSFormatState}   state           The formatter state.
         */
        CSSFormatter.prototype.generateParentSelectors = function (parent, isAfterComment, indent, state) {

            var parser = this._parser,
                options = this._options;

            options.selectors.newLine && state.hasLines() && state.newLine(indent);

            this.generateLinesBeforeSelector(state, indent, null, isAfterComment);

            state.current.push(parent);

            this.generateOpeningBrace(state, indent);

            for (var i = 0, prev, child; child = parent.children[i]; i++) {

                if (child instanceof CSSComment) {
                    this.generateComment(child, indent + options.indent, state);
                } 
                else if (child instanceof CSSParentSelector) {
                    this.generateParentSelectors(child, prev && prev instanceof CSSComment, indent + options.indent, state);
                } 
                else if (child instanceof CSSSelectors) {
                    this.generateSelectors(child, prev && prev instanceof CSSComment, indent + options.indent, state);
                    this.generateProperties(child, indent + options.indent, state);
                }

                prev = child;
            }

            this.generateClosingBrace(state, indent);
        };

        /**
         * Format and output selectors and opening brace.
         * 
         * @param   {CSSSelectors}    selectors       The selectors object to format.
         * @param   {true|false}      isAfterComment  True if the comment proceeds a comment, otherwise false.
         * @param   {number}          indent          The number of indents to add before the selector.
         * @param   {CSSFormatState}  state           The formatter state.
         */
        CSSFormatter.prototype.generateSelectors = function (selectors, isAfterComment, indent, state) {
            var options = this._options,
                sopts = options.selectors;

            options.selectors.newLine && state.hasLines() && state.newLine(indent);

            this.generateLinesBeforeSelector(state, indent, selectors, isAfterComment);

            // get and add comma if the current context calls for one
            function comma(index, output) {
                var isLast = index === selectors.selectors.length - 1;
                if (!isLast) {
                    output.push(',' + CSSUtils.spaces(sopts.multispace));
                }
            }

            for (var i = 0, last = selectors.selectors.length - 1, sel; sel = selectors.selectors[i]; i++) {

                var text = [sel];
                comma(i, text);

                var newLine = (function () {
                    if (!sopts.maxLength)
                        return false;

                    if (sopts.forcePerLine)
                        return i !== last;

                    if (sopts.combinatedPerLine && sel.hasCombinator()) {
                        
                        if (state.current.text().length !== 0 && i !== 0) {
                            // put on own line if not on new line from previous selector
                            state.newLine(indent);
                        }
                        
                        return i !== last;
                    }

                    var newLen = state.current.length() + text.toString().length;
                    return i !== last && newLen > sopts.maxLength;
                }());

                state.current.push(text);
                newLine && state.newLine(indent);

            }

            // add opening brace
            if (options.braces.openNewLine) {
                state.newLine(indent);
            }

            this.generateOpeningBrace(state);
        };

        /**
         * Format and output properties and closing brace.
         * 
         * @param {CSSSelectors}    selectors    The selectors whose properties are to be formatted.
         * @param {number}          indent       The indent depth of the comment.
         * @param {CSSFormatState}  state        The formatter state.
         */
        CSSFormatter.prototype.generateProperties = function (selectors, indent, state) {
            var options = this._options,
                popts = options.property,
                copts = options.comments,
                properties = selectors.properties;

            for (var i = 0, last = properties.length - 1, prop; prop = properties[i]; i++) {

                // add comment line
                if (prop instanceof CSSComment) {
                    if (copts.renderProperty) {

                        popts.newLine && state.newLine(indent);

                        state.current.push([CSSUtils.spaceChar, prop]);
                    }
                    continue;
                } else if (prop instanceof CSSProperty) {

                    popts.newLine && state.newLine(indent + options.indent);

                    state.current.push([prop.name(), ':']);

                    popts.spaceBetween && state.current.push(CSSUtils.spaces(popts.spaceBetween));

                    state.current.push(prop.value());

                    if (last !== i || (popts.closeLast && last === i))
                        state.current.push(';');

                    // add inline comment
                    if (prop.comment) {
                        if (copts.inlineSpace)
                            state.current.push(CSSUtils.spaces(copts.inlineSpace));

                        state.current.push(prop.comment);
                    }

                    popts.indentAfter && state.current.push(CSSUtils.spaces(popts.indentAfter));
                }
            }

            this.generateClosingBrace(state, indent);
        };

        /**
         * Generate opening brace.
         * 
         * @param {CSSFormatState}   state   The formatter state.
         * @param {number}           indent  The current indent.
         */
        CSSFormatter.prototype.generateOpeningBrace = function (state, indent) {
            var current = state.current,
                braces = this._options.braces;

            braces.openNewLine && state.newLine(indent);
            braces.openIndent && current.push(CSSUtils.spaces(braces.openIndent));
            current.push('{');
            braces.openIndentAfter && current.push(CSSUtils.spaces(braces.openIndentAfter));
        };

        /**
         * Generate closing brace.
         * 
         * @param {CSSFormatState}   state   The formatter state.
         * @param {number}           indent  The current indent.
         */
        CSSFormatter.prototype.generateClosingBrace = function (state, indent) {
            var current = state.current,
                braces = this._options.braces;

            braces.closeNewLine && state.newLine(indent);
            braces.closeIndent && current.push(CSSUtils.spaces(braces.closeIndent));
            state.current.push('}');
            braces.closeIndentAfter && current.push(CSSUtils.spaces(braces.closeIndentAfter));
        };

        /**
         * Generate empty lines before selector.
         * 
         * @param   {CSSFormatState}  state           The formatter state.
         * @param   {number}          indent          The current indent.
         * @param   {CSSSelectors}    selectors       The selectors the lines are before.
         * @param   {boolean}         isAfterComment  True if the selectors are after a comment.
         */
        CSSFormatter.prototype.generateLinesBeforeSelector = function (state, indent, selectors, isAfterComment) {
            var sopts = this._options.selectors;

            var linesBefore = (function () {

                if (!state.hasLines())
                    return 0;

                var result = sopts.linesBefore;

                if (isAfterComment) {
                    result = sopts.linesBeforeComment;
                } else if (sopts.linesBeforeMulti && (!selectors || selectors.selectors.length > 1)) {
                    result = Math.max(result, sopts.linesBeforeMulti);
                }

                return result;
            }());

            // add empty lines before selector
            this.addEmptyLines(linesBefore, indent, state);
        };

        /**
         * Add empty lines
         * 
         * @param   {number}          total   The number of lines.
         * @param   {number}          indent  The current indent.
         * @param   {CSSFormatState}  state   The generator state.
         */
        CSSFormatter.prototype.addEmptyLines = function (total, indent, state) {
            for (var i = 0; i < total; i++) {
                state.newLine(indent);
            }
            return total;
        };

        /**
         * Get generated stylesheet as a string.
         * 
         * @returns {string}
         */
        CSSFormatter.prototype.toString = function () {
            var output = '';
            for (var i = 0, line; line = this._lines[i]; i++) {
                output += String.spaces(line.indent) + line + '\n';
            }
            return output;
        };


        /**
         * Used to pass formatter state to functions.
         */
        function CSSFormatState() {
            this.lines = [];
            this.current = new CSSLine();
            this.hasLines = function () {
                return this.lines.length ||
                    this.current.text().length;
            }
        }

        /**
         * Create a new line using the specified indent.
         * 
         * @param {number} indent  The number of spaces to indent the new line with.
         */
        CSSFormatState.prototype.newLine = function (indent) {
            this.lines.push(this.current);
            this.current = new CSSLine();
            this.current.indent = indent || 0;
        }

        return CSSFormatter;

}]);


module.factory('CSSLine', [function () {

    /**
     * Class that represents a single CSS line.
     * 
     * @param {number}               [indent=0]  The number of indents before the text.
     * @param {string|object|array}  [text]      The initial text.
     */
    function CSSLine(indent, text) {
        this._text = new CSSLineObjects(text);
        this.indent = indent || 0;
    }

    /**
     * Get or set the line text.
     * 
     * @param   {string,object,Array}  text   The line text.
     *                                     
     * @returns {CSSLineObjects}
     */
    CSSLine.prototype.text = function (text) {
        if (typeof text !== 'undefined') {
            this._text = new CSSLineObjects(text);
        }

        return this._text;
    };

    /**
     * Convenience function to push more text into the current text.
     * 
     * @param {string|object|Array}  text  The text to push.
     */
    CSSLine.prototype.push = function (text) {
        this._text.push(text);
    };

    /**
     * Get the length of the line as a string.
     * 
     * @returns {number}
     */
    CSSLine.prototype.length = function () {
        return this._text.toString().length;
    };

    /**
     * Get the CSS line as a string.
     * 
     * @returns {string}
     */
    CSSLine.prototype.toString = function () {
        return this._text.toString();
    };

    /**
     * Array of objects that represent individual components in the line text.
     * 
     * @param {object|Array} [first]  The first object to put into the array
     */
    function CSSLineObjects(first) {
        this.push(first);
    }

    CSSLineObjects.prototype = new Array;

    CSSLineObjects.prototype._push = CSSLineObjects.prototype.push;

    /**
     * Push text objects into the line objects array. All arrays that are
     * pushed are flattened.
     */
    CSSLineObjects.prototype.push = function (obj) {

        if (obj instanceof Array) {
            for (var i = 0; i < obj.length; i++) {
                pushArray(obj[i], this);
            }
        } else if (typeof obj !== 'undefined') {
            this._push(obj);
        }

        function pushArray(obj, self) {
            if (obj instanceof Array) {
                for (var i = 0; i < obj.length; i++) {
                    pushArray(obj[i]);
                }
            } else if (typeof obj !== 'undefined') {
                self._push(obj);
            }
        }
    };


    /**
     * Get the line as a string.
     */
    CSSLineObjects.prototype.toString = function () {
        var result = '';
        for (var i = 0; i < this.length; i++) {
            result += this[i].toString();
        }
        return result;
    };

    return CSSLine;
    
}]);


module.factory('CSSParentSelector', [function () {

    /**
     * CSS parent selector data object. (i.e @media)
     * 
     * @param {CSSSelector} selector  The selector.
     */
    function CSSParentSelector(selector) {
        this.selector = selector;
        this.children = [];
        this.start = 0;
        this.end = 0;
    };

    /**
     * Get the parent selector as a string.
     */
    CSSParentSelector.prototype.toString = function () {
        return this.selector;
    };

    return CSSParentSelector;

}]);


module.factory('CSSParser', ['CSSComment', 'CSSParentSelector', 'CSSProperty', 'CSSSelectors', 'CSSSelector', function (CSSComment, CSSParentSelector, CSSProperty, CSSSelectors, CSSSelector) {

    /**
     * Internal class used to track the parser state.
     * 
     * @param {string} css   The original css stylesheet being formatted.
     */
    function CSSParserState(css) {
        this.css = css;
        this.i = 0;
        // selectors that can have child selectors (embedded)
        this.parentSelectors = [
            '@media'
        ];
    }

    /**
     * Parses stylesheet string into an object model.
     * 
     * @param {string|CSSParserState} css   The stylesheet to parse.
     */
    function CSSParser(css) {

        var state = typeof css === 'string' ? new CSSParserState(css) : css,
            selectors = this._selectors = [],
            mode = 'none', // parse-selector, parse-property, parse-value
            currSelectors = null,
            currProperty = null,
            prevProperty = null;

        if (!state.css)
            return;

        // push current selectors into array and reset
        function pushSelectors() {
            currSelectors && selectors.push(currSelectors);
            currSelectors = null;
            mode = 'none';
        }

        // put current property into current selectors and reset.
        function nextProperty() {
            if (currProperty && currSelectors) {
                currSelectors.properties.push(currProperty);
                prevProperty = currProperty;
                currProperty = null;
            }
        }

        for (var ch; state.i < state.css.length; state.i++) {

            var hasReturn = this.skipWhiteSpace(state);
            ch = state.css[state.i];

            // check for comments
            if (ch === '/') {
                if (state.css[state.i + 1] !== '*')
                    throw 'Illegal character "/"';

                // selector comment
                if (mode == 'none') {
                    selectors.push(this.parseComment(state, 'selector'));
                }
                // property comment
                else if (hasReturn && currSelectors) {
                    currSelectors.properties.push(this.parseComment(state, 'property'));
                }
                // inline property comment
                else if (!hasReturn && prevProperty) {
                    prevProperty.comment = this.parseComment(state, 'property-inline');
                }

            }
            // parse selectors
            else if (mode === 'none') {

                // check for embeddable selectors
                if (this.matchAhead(state.parentSelectors, state)) {
                    var result = this.parseTill('{', state);
                    state.i++;

                    var parent = new CSSParentSelector(result.trim());
                    var parser = new CSSParser(state);
                    for (var j = 0, item; item = parser.getSelectors()[j]; j++) {
                        parent.children.push(item);
                    }
                    selectors.push(parent);
                }
                else {

                    if (ch === '}')
                        break;

                    currSelectors = this.parseSelectors(state);
                    if (!currSelectors) {
                        pushSelectors();
                        continue;
                    }

                    mode = 'parse-property';
                }
            }
            // parse property name
            else if (mode === 'parse-property') {

                currProperty = this.parseProperty(state);

                if (currProperty.isEnd) {
                    pushSelectors();
                    continue;
                }

                mode = 'parse-value';

            }
            // parse property value
            else if (mode === 'parse-value') {

                var result = this.parseValue(state, currProperty);

                nextProperty();

                if (result.isEnd) {
                    pushSelectors();
                } else {
                    mode = 'parse-property';
                }
            }
        }
    }

    /**
     * Get parsed CSSSelector objects.
     * 
     * @returns {Array} Array of CSSSelectors, CSSComment and CSSParentSelectors
     */
    CSSParser.prototype.getSelectors = function () {
        return this._selectors;
    };

    /**
     * Skip ahead until a non-white-space character is found.
     * 
     * @param   {CSSParserState}  state  The parser state.
     *                              
     * @returns {true|false}  true if return/new-line characters were found during 
     *                        skip, otherwise false.
     */
    CSSParser.prototype.skipWhiteSpace = function (state) {
        var hasReturn = false;
        for (var ch; ch = state.css[state.i]; state.i++) {
            if (' \t\n\r'.indexOf(ch) !== -1) {

                if (!hasReturn && ' \t'.indexOf(ch) === -1)
                    hasReturn = true;

                continue;
            }

            break;
        }
        return hasReturn;
    };

    /**
     * Continue parsing until a specific character is found.
     * 
     * @param   {string}    term   The character to stop at.
     * @param   {CSSParserState}  state  The parser state.
     *                             
     * @returns {string}  The characters that were parsed.
     */
    CSSParser.prototype.parseTill = function (term, state) {
        var result = '';
        for (var ch; ch = state.css[state.i]; state.i++) {
            if (ch === term)
                break;

            result += ch;
        }
        return result;
    };


    /**
     * check if the next characters in the CSS match any strings in a terms array.
     *
     * @param {Array}     terms  An array of strings to match against.
     * @param {CSSParserState}  state  The parser state.
     *
     * @returns {string|null}  The matching string or null if no matches.
     */
    CSSParser.prototype.matchAhead = function(terms, state) {
        for (var i= 0, isMatch = true, match; match = state.parentSelectors[i]; i++) {

            for (var j= state.i, ch; ch = state.css[j]; j++) {

                var letterIndex = j - state.i;
                if (letterIndex === match.length)
                    break;

                if (ch !== match[letterIndex]) {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch) {
                return match;
            }
        }
        return null;
    };

    /**
     * Parse selector comment.
     * 
     * @param   {CSSParserState}  state  The parser state.
     * @param   {string}          type   The comment type.
     *
     * @returns {CSSComment}
     */
    CSSParser.prototype.parseComment = function (state, type) {
        var comment = '',
            start = state.i;

        for (var ch; ch = state.css[state.i]; state.i++) {
            
            // remove return characters to make line return handling easier
            if (ch === '\r')
                continue;

            comment += ch;
            if (ch === '/' && state.css[state.i - 1] === '*') {
                break;
            }
        }
        var com = new CSSComment(comment, type);
        com.start = start;
        com.end = state.i;
        return com;
    };

    /**
     * Parse selectors.
     * 
     * @param   {CSSParserState}   state  The parser state.
     *                              
     * @returns {CSSSelectors}
     */
    CSSParser.prototype.parseSelectors = function (state) {

        var current = '',
            selectors = [],
            result = new CSSSelectors(selectors);

        result.start = state.i;

        for (var ch; ch = state.css[state.i]; state.i++) {
            if (ch === '{') {
                current = current.trim();
                if (current)
                    selectors.push(new CSSSelector(current));

                result.end = state.i;
                return result;

            } else if (ch === ',') {
                current = current.trim();
                selectors.push(new CSSSelector(current));
                current = '';
                continue;

            } else if (ch === '}') {
                break;
            }
            current += ch;
        }

        if (current.trim()) {
            throw 'End of document reached prematurely while parsing selectors: "' + selectors + '" ending with "' + current + '"';
        }

        return null;
    };

    /**
     * Parse property name.
     * 
     * @param   {CSSParserState}  state  The parser state.
     *                               
     * @returns {CSSProperty}
     */
    CSSParser.prototype.parseProperty = function (state) {

        var property = new CSSProperty(),
            name = '';

        property.start = state.i;

        for (var ch; ch = state.css[state.i]; state.i++) {
            if (ch === ':') {
                property.name(name);
                return property;

            } else if (ch === '}') {
                if (name.trim())
                    throw 'Premature end while parsing property: ' + name;

                property.name(name);
                property.isEnd = true;
                property.end = state.i;
                return property;
            }
            name += ch;
        }
        throw 'End of document reached prematurely while parsing property: ' + name;
    };


    /**
     * Parse property value.
     * 
     * @param   {CSSParserState} state     The parser state.
     * @param   {CSSProperty}    property  The property the value is for.
     *                                   
     * @returns {CSSProperty}
     */
    CSSParser.prototype.parseValue = function (state, property) {

        var value = '',
            quote = null,
            mode = 'value',
            isEnd = false;

        for (var ch; ch = state.css[state.i]; state.i++) {
            if (ch === '\'' || ch === '"') {
                if (mode === 'literal' && quote === ch) {
                    mode = 'value';
                } else if (mode === 'value') {
                    mode = 'literal';
                    quote = ch;
                }
            } else if ((ch === ';' || ch === '}') && mode === 'value') {
                break;
            }
            value += ch;
        }

        property.value(value);
        property.isEnd = ch === '}';
        property.end = state.i;
        return property;
    };

    return CSSParser;

}]);


module.factory('CSSProperty', ['CSSPropertyName', 'CSSPropertyValue', 'CSSUtils', function (CSSPropertyName, CSSPropertyValue, CSSUtils) {

    /**
     * CSS property data object.
     * 
     * @param {string} name   The property name.
     * @param {string} value  The property value.
     */
    function CSSProperty(name, value) {
        this._name = typeof name === 'string' ? new CSSPropertyName(name) : null;
        this._value = typeof value === 'string' ? new CSSPropertyValue(value) : null;
        this.comment = null;
        this.start = 0;
        this.end = 0;
    }

    /**
     * Get or set the CSS property name.
     * 
     * @param   {string} name  The name of the property.
     * 
     * @returns {CSSPropertyName}
     */
    CSSProperty.prototype.name = function (name) {
        if (typeof name === 'undefined')
            return this._name;

        return this._name = new CSSPropertyName(name);
    };

    /**
     * Get or set the CSS property value.
     * 
     * @param   {string} value  The property value.
     *
     * @returns {CSSPropertyValue}
     */
    CSSProperty.prototype.value = function (value) {
        if (typeof value === 'undefined')
            return this._value;

        return this._value = new CSSPropertyValue(value);
    };

    /**
     * Get the property as a string.
     * 
     * @param {number} depth   The number of indents to add.
     * @param {string} indent  The indent string to use.
     *
     * @returns {string}
     */
    CSSProperty.prototype.toString = function (depth, indent) {
        var result = CSSUtils.indent(this.name() + ': ' + this.value() + ';', depth, indent);
        if (this.comment)
            result += ' ' + this.comment;
        return result;
    };

    return CSSProperty;
}]);


module.factory('CSSPropertyName', [function () {

    /**
     * CSS Property name data object.
     * 
     * @param {string} name  The property name.
     */
    function CSSPropertyName(name) {
        this.name = name.trim();
    }

    /**
     * Get the property name.
     * 
     * @returns {String}
     */
    CSSPropertyName.prototype.toString = function () {
        return this.name;
    };

    return CSSPropertyName;
}]);


module.factory('CSSPropertyValue', [function () {

    /**
     * CSS Property value data object.
     * 
     * @param {string} name  The property name.
     */
    function CSSPropertyValue(value) {
        this.value = value.trim();
    }

    /**
     * Get the property value.
     * 
     * @returns {String}
     */
    CSSPropertyValue.prototype.toString = function () {
        return this.value;
    };

    return CSSPropertyValue;
}]);


module.factory('CSSSelector', [function () {

    /**
     * Single selector data object.
     * 
     * @param {string} name  The selector name.
     */
    function CSSSelector(name) {
        this.name = name.trim();
    }

    /**
     * Determine if the selector has a combinator.
     * 
     * @returns {true|false}
     */
    CSSSelector.prototype.hasCombinator = function () {
        return this.name.indexOf(' ') !== -1 ||
            this.name.indexOf('>') !== -1 ||
            this.name.indexOf('+') !== -1 ||
            this.name.indexOf('~') !== -1;
    };

    /**
     * Get the selector as a string.
     */
    CSSSelector.prototype.toString = function () {
        return this.name;
    };

    return CSSSelector;
}]);


module.factory('CSSSelectors', ['CSSUtils', function (CSSUtils) {

    /**
     * Data object of selectors and the properties assigned to them.
     * 
     * @param {Array} [selectors]   Array of CSSSelector
     * @param {Array} [properties]  Array of CSSProperty
     */
    function CSSSelectors(selectors, properties) {
        this.selectors = selectors || [];
        this.properties = properties || [];
        this.start = 0;
        this.end = 0;
    }

    /**
     * Get the selector names as a string.
     */
    CSSSelectors.prototype.toString = function () {
        return this.selectors.toString();
    };

    return CSSSelectors;

}]);


module.factory('CSSTableOfContents', ['CSSComment', 'CSSFormatter', 'CSSLine', 'CSSUtils', function (CSSComment, CSSFormatter, CSSLine, CSSUtils) {

    /**
     * Table Of Contents formatter class.
     * 
     * Formats stylesheet and adds table of contents. Indentation of formatting reflects
     * depth of entries in table of contents.
     * 
     * Table of contents is generated using comments. The depth of an entry is determined by
     * the number of astericks at the beginning of the comment. The more astericks, the higher the
     * level and the lower the depth. Comments with only a single asterick are ignored.
     * 
     * @param {CSSParser}  parser        The Css parser to use.
     * @param {object}     [options={}]  Options for tables and CSS formatter.
     */
    function CSSTableOfContents(parser, options) {

        this._options = options = options || {};

        var formatter = new CSSFormatter(parser, options),
            lines = formatter.getLines(),
            output = this._output = this.generateTableLines(lines);

        if (options.showLineNumbers) {
            for (var i = 0, tableLine; tableLine = output[i]; i++) {
                if (tableLine.comment) {
                    var lineNum = this.getCommentLineIndex(tableLine.comment, lines);
                    if (lineNum >= 0) {
                        var text = tableLine.text().toString().substr(1 + (2 * CSSUtils.spaceChar.length))
                        var number = CSSUtils.minLeft((lineNum + output.length + 1).toString(), 5);
                        tableLine.text(new CSSComment('*' + number + text));
                    }
                }
            }
        }


        // append formatted lines to table of content lines
        for (var i = 0, indent = 0, line; line = lines[i]; i++) {

            // add ToC indents
            if (options.tocIndent) {
                var text = line.text();
                for (var j = 0, obj; obj = text[j]; j++) {
                    if (typeof obj.tableIndent === 'number') {
                        indent = obj.tableIndent;
                        break;
                    }
                }

                line.indent += indent;
            }
            output.push(line);
        }
    }

    /**
     * Get the generated CSS lines.
     * 
     * @returns {Array}  Array of CSSLine
     */
    CSSTableOfContents.prototype.getLines = function () {
        return this._output;
    };

    /**
     * Get the line index of a selector comment.
     * 
     * @param   {CSSComment} comment  The comment to check.
     * @param   {Array} lines         Array of CSSLine.
     * 
     * @returns {number} The line index or -1 if not found.
     */
    CSSTableOfContents.prototype.getCommentLineIndex = function (comment, lines) {
        for (var i = 0, line; line = lines[i]; i++) {
            for (var j = 0, obj; obj = line.text()[j]; j++) {
                if (obj === comment)
                    return i;
            }
        }
        return -1;
    }

    /**
     * Generate table of contents.
     * 
     * @param   {Array} selectors Array of CSSSelectors, CSSComment and CSSParentSelector.
     *                            
     * @returns {Array} Array of CSSLine
     */
    CSSTableOfContents.prototype.generateTableLines = function (lines) {

        var comments = [],
            depths = [],
            depthSet = {},
            options = this._options;

        // get comments
        for (var i = 0, line; line = lines[i]; i++) {
            var text = line.text(),
                str = text.toString();
            if (text[0] instanceof CSSComment && str.indexOf('/*') === 0) {

                var depthString = this.getDepthString(text[0]);
                if (depthString.length === 1)
                    continue;

                comments.push(text[0]);

                // add to depth "set" to prevent duplicates,
                // will determine the meaning of each later
                depthSet[depthString] = 0;
            }
        }

        // place depth strings in array so they can be sorted by size
        for (var name in depthSet) {
            depths.push(name);
        }
        depths.sort();
        depths.reverse();

        // assign numberic depth values
        for (i = 0, depthString; depthString = depths[i]; i++) {
            depthSet[depthString] = i + 1;
        }

        var lines = [];
        var depthIndent = typeof options.depthIndent === 'number' ? options.depthIndent : 4;

        lines.push(new CSSLine(0, new CSSComment('/*')));
        lines.push(new CSSLine(1, new CSSComment('* TABLE OF CONTENTS')));
        lines.push(new CSSLine(1, new CSSComment('*')));

        for (var i = 0, comment; comment = comments[i]; i++) {

            var depthString = this.getDepthString(comment);
            var depth = depthSet[depthString];

            var extracted = this.extractComment(comment);
            if (!extracted)
                continue;

            var line = new CSSLine(1, new CSSComment('*' + CSSUtils.indent('- ' + extracted, depth)));
            line.comment = comment;
            comment.tableIndent = line.tableIndent = (depth - 1) * depthIndent;

            lines.push(line);
        }

        lines.push(new CSSLine(1, new CSSComment('*')));
        lines.push(new CSSLine(1, new CSSComment('*/')));
        lines.push(new CSSLine(0));
        lines.push(new CSSLine(0));

        lines.depthSet = depthSet;

        return lines;
    };

    /**
     * Get the asterick string that indicates a comments depth.
     * 
     * @param   {CSSComment}  comment  The selector comment.
     * 
     * @returns {string}
     */
    CSSTableOfContents.prototype.getDepthString = function (comment) {
        // get the preceding astericks
        var depthString = '';
        for (var j = 1; j < comment.trimmed.length; j++) {
            var ch = comment.trimmed[j];
            if (ch !== '*')
                break;

            depthString += '*';
        }
        return depthString;
    };


    /**
     * Extract comment text without start and end astericks.
     * 
     * @param   {CSSComment}  comment  The comment.
     *                                  
     * @returns {string}
     */
    CSSTableOfContents.prototype.extractComment = function (comment) {

        var sub = comment.trimmed.substr(1, comment.trimmed.length - 2);
        var result;
        var firstPass = '';
        var endDepth = false;

        for (var j = 0, ch; ch = sub[j]; j++) {

            if (ch === '\t') {
                ch = '    ';
                endDepth = true;
            } else if (ch === '\r' || ch === '\n') {
                break;
            } else if (ch === '*') {
                if (!endDepth)
                    continue;
            }

            endDepth = true;
            firstPass += ch;
        }

        for (var j = firstPass.length - 1, ch; ch = firstPass[j]; j--) {
            if (ch !== '*') {
                result = firstPass.substr(0, j);
                break;
            }
        }

        return result.trim();
    }

    /**
     * Get the formatted stylesheet with table of contents as a string.
     */
    CSSTableOfContents.prototype.toString = function () {
        var output = '';
        for (var i = 0, line; line = this._output[i]; i++) {
            output += CSSUtils.spaces(line.indent) + line.text + '\n';
        }
        return output;
    }

    return CSSTableOfContents;

}]);


module.factory('CSSUtils', [function () {
    var factory;
    return factory = {

        /**
         * The space character to use.
         */
        spaceChar: '&nbsp;',

        /**
         * The default string that is a single indent.
         */
        indentString: '&nbsp;&nbsp;&nbsp;&nbsp;',

        /**
         * Add an indent to the beginning of a string.
         * 
         * @param   {string} str            The string to indent.
         * @param   {number} depth          The number of indents to add.
         * @param   {string} indentString   The string that is a single indent.
         *                                  
         * @returns {string}
         */
        indent: function (str, depth, indentString) {
            depth = typeof depth === 'number' ? depth : 1;
            indentString = typeof indentString === 'undefined' ? factory.indentString : indentString;

            var indent = '';
            for (var i = 0; i < depth; i++) {
                indent += indentString;
            }
            return indent + str;
        },

        /**
         * Generate a string of space characters.
         * 
         * @param   {number} length       The number of spaces.
         * @param   {string} [spaceChar]  The space character to use.
         *                           
         * @returns {string}
         */
        spaces: function (length, spaceChar) {
            var result = '';
            for (var i = 0; i < length; i++) {
                result += spaceChar || factory.spaceChar;
            }
            return result;
        },

        /**
         * Pad the left side of a string with the specified characters.
         * 
         * @param  {number} length    The number of characters to add.
         * @param  {string} [ch=' ']  The character to use for padding.
         * 
         * @returns {string}
         */
        padLeft: function (str, length, ch) {
            ch = ch || factory.spaceChar
            for (var i = 0; i < length; i++) {
                str = ch + str;
            }
            return str;
        },

        /**
         * Ensure the string is a minumum length and if not, pad left.
         * 
         * @param {string} str       The string to pad.
         * @param {number} length    The minimum length of the string.
         * @param {string} [ch=' ']  The character to use for padding.
         */
        minLeft: function (str, length, ch) {
            ch = ch || factory.spaceChar;
            var startLen = str.length,
                addLen =0;
            
            while (startLen + addLen < length) {
                str = ch + str;
                addLen++;
            }
            return str;
        }
    };

}]);


module.directive('cssLines', ['CSSComment', 'CSSParentSelector', 'CSSSelector', 'CSSPropertyName', 'CSSPropertyValue', 'CSSUtils', function (CSSComment, CSSParentSelector, CSSSelector, CSSPropertyName, CSSPropertyValue, CSSUtils) {

    var ae = angular.element;

    function nbsp(str) {
        return str.toString().replace(/ /g, '&nbsp;');
    }

    return {
        restrict: 'A',
        scope: {
            lines: '=cssLines'
        },
        link: function (scope, elem, attrs) {

            scope.$watch('lines', function () {

                elem.html('');

                if (!scope.lines)
                    return;

                for (var i = 0, line; line = scope.lines[i]; i++) {
                    var div = ae('<div class="css-line"></div>')
                    elem.append(div);

                    if (line.text().length === 0) {
                        div.append('<span>&nbsp;</span>');
                        continue;
                    }

                    if (line.indent)
                        div.append('<span class="indent">' + CSSUtils.spaces(line.indent) + '</span>');

                    for (var j = 0, item; item = line.text()[j]; j++) {

                        var className;
                        if (item instanceof CSSComment) {
                            className = 'css-comment ' + item.type;
                        } else if (item instanceof CSSParentSelector) {
                            className = 'css-selector';
                        } else if (item instanceof CSSSelector) {
                            className = 'css-selector';
                        } else if (item instanceof CSSPropertyName) {
                            className = 'css-property-name';
                        } else if (item instanceof CSSPropertyValue) {
                            className = 'css-property-value';
                        } else {
                            className = 'css-text';
                        }

                        if (className)
                            div.append('<span class="' + className + '">' + item + '</span>');
                        else {
                            div.append('<span>' + item + '</span>');
                        }
                    }
                }
            });

        }
    };
}]);
}());