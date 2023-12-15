///
// functions that help other functions to do their thing.
//
var MAIN = {},

HELP = (function($, window, document, undefined) {
    var pub = {};

    
    //
    //
    //
    pub.timezone = "Europe/London";


    //
    // Get keyboard key from event Object.
    //
    pub.getKey = (e) => {
        if (e.key) return e.key;
        return String.fromCharCode(e.which || e.keyCode);
    };


    //
    // Remove <script> tags and any attributes that start with 'on' (onclick, etc).
        // This helps to guards against XSS attack.
    // @Params:
    // escapeChars: Won't escape certain HTML such as & (to &amp;) when set to false.
        // This is less secure but useful and necessary for certain cases.
    //
    pub.sanitizeHTML = (str, allowedTags, escapeChars = true) => {
        if (!str) return;

        const escapeCharacters = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;'
        };
        if (allowedTags) {
            var regex = new RegExp(`<((?!\/?(${allowedTags})\\b)[^>]+)>`, 'gi');
            // Remove all HTML except a few allowed tags.
            str = str.replace(regex, '')
                // Remove "src" from any allowed HTML.
                .replace(/src/gi, '');
        }
        else {
            if (escapeChars) {
                // Escape certain HTML characters.
                // (Match & if not followed by (apos|quot|gt/lt|amp);)
                str = str.replace(/[<>]|&(?!(?:apos|quot|[gl]t|amp);)/gi, match => escapeCharacters[match]);
                // All combinations of the character "<" in HTML/JS (semicolon optional):
            }
            str = str.replace(/(\x3c:?|\u003c:?)|(?:&(amp;)?#0*60;?|&(amp;)?#x0*3c;?):?/gi, '');
        }
        str = str.toString()
            // Remove <script> tags and content.
            // Remove ".constructor" to prevent ES6 Set.constructor() from eval() things.
            // Remove "document.cookie" to prevent session hijacking.
            .replace(/<.*?script.*?>|.constructor|document.cookie|document.domain/gi, '')
            // Remove substrings that start with "on" (event attributes. ex: "onclick").
            .replace(/<[^>]*\s+[^>]*on\w+[^>]*>/gi, '')
            // Remove instances of "javascript:", "script:" (for "ascript:") or &{ (for "& JS includes").
            .replace(/javascript.*?:|script.*?:|&{/gi, '')
            // Remove "script:" decimal HTML Characters (&#0000099 or &#99. semicolon optional).
            .replace(/&#0*115;?|&#0*99;?|&#0*114;?|&#0*105;?|&#0*112;?|&#0*116;?|&#0*58;?/g, '')
            // Remove "script:" Hexadecimal HTML Characters (&#x0000073 or &#x73. semicolon optional).
            .replace(/&#x0*73;?|&#x0*63;?|&#x0*72;?|&#x0*69;?|&#x0*70;?|&#x0*74;?|&#x0*3A;?/gi, '');
        
        return str;
    };


    //
    // Remove unnecessary/unsafe HTML attributes from Object of key|value pairs.
    //
    pub.sanitizeAttrs = (attrs = {}) => {
        const allowedAttrs = ['id', 'class', 'href', 'data-ms-action'];

        for (var key in attrs) {
            if (!allowedAttrs.includes(key)) delete attrs[key];
        }
        return attrs;
    };


    //
    // Convert basic token tags such as [p class="foo"]bar[/p] to HTML.
    //
    pub.tokenHTML = (str) => {
        if (!str) return;
        str = pub.sanitizeHTML(str);

        // Allowed tags: p, strong, em, a, div, h[1-6], span
        return str
            // replace [] tags with <>.
            .replace(/\[(\/?(?:p|strong|em|a|div|h[1-6]|span)(?:\s+[^[\]]+)?)]/gi, (match, tag) => {
                var tag = tag.toLowerCase(),
                    openTag = tag.startsWith('/') ? `</${tag.slice(1)}` : '<'+ tag;
                return openTag.endsWith(']') ? openTag.slice(0, -1) +'>' : openTag +'>';
            })
            // Remove substrings that start with "on" (event attributes. ex: "onclick").
            .replace(/on\w{2,}=/gi, '');
    };


    //
    //
    //
    pub.getEnvType = function() {
        return location.hostname.indexOf('webflow') > -1 ? 'test' : 'live';
    };


    //
    //
    //
    pub.getCurrentDomain = function() {
        return window.location.origin;
    };


    //
    // Return human-friendly date.
    //
    pub.formatTimestamp = function(timestamp, showTime, localTimezone) {
        if (!timestamp) return;

        var date = new Date(timestamp),
            locale = 'en',
            options = {
                //weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
        if (localTimezone) {
            // Convert to localtime if it's not already converted.
            options.timeZone = pub.timezone;
        }
        if (showTime) {
            $.extend(options, {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        if (typeof timestamp == "string") {
            // Convert to a timestamp.
            timestamp = date.getTime();
        }
        if (timestamp.toString().length < 11) {
            date.setTime(timestamp * 1000);
        }
        return date.toLocaleDateString(locale, options);
    };


    //
    // Convert a date-time String into a Timestamp.
    //
    // Expected dateString parts order to be: "DD-MM-YYYY HH:MM:SS".
        // Unless "usaFormat" is TRUE, then it's: "MM-DD-YYYY HH:MM:SS".
    // Date can be separated by / - or spaces.
    // Ex: dateString = "23/08/2023, 04:53:34";
    //
    pub.getTimestamp = (dateString, localTimezone, usaFormat) => {
        let date = new Date(),
            lang = 'en',
            options = {};

        if (localTimezone) {
            options.timeZone = pub.timezone;
        }

        if (dateString) {
            let lastSpaceIndex = dateString.lastIndexOf(" "),
                dateStr = dateString.substring(0, lastSpaceIndex),
                timeStr = dateString.substring(lastSpaceIndex + 1),
                dateParts = dateStr.replace(/[-\/\s]/g, "||").split('||'),
                monthIndex = usaFormat ? 0 : 1;

            // Convert month. Ex: from 08 to "Aug" (short names).
            date.setMonth(dateParts[monthIndex] - 1);
            options.month = 'short';
            dateParts[monthIndex] = date.toLocaleString(lang, options);

            // Rebuild as: 23 Aug 2023 04:53:34.
            // May still contain a comma but thats ok.
            dateString = dateParts.join(' ') +` ${timeStr} GMT`;
        }
        else {
            // Use the current date/time.
            dateString = new Date().toLocaleString(lang);
        }

        // Replace options but keep (optional) "timeZone".
        $.extend(options, {
            day: "numeric",
            month: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true
        });
        // date = new Date(Date.parse(dateString)).toLocaleString(lang, options);
        let daylightSaving = localTimezone ? 0 : date.getTimezoneOffset()*60*1000;
        date = new Date(Date.parse(dateString) + daylightSaving).toLocaleString(lang, options);
        return Date.parse(date);
    };
    

    //
    // Convert a timestamp into an ISO date format (ex: 2023-08-23T04:53:34.000Z)
    //
    pub.getISOdate = (dateString, localTimezone) => {
        var date = pub.getTimestamp(dateString, localTimezone);
        return new Date(date).toISOString();
    };


    //
    //
    //
    pub.callNestedFunction = function(string, ...args) {
        var path = string.split("."),
            functionName = path.pop(),// Extracting the function name from the string.
            nestedObject = pub.getProperty(window, path.join("."));// Assuming the top-level object is the global scope.

        if (nestedObject && typeof nestedObject[functionName] === 'function') {
            // Calling the function dynamically.
            return nestedObject[functionName](...args);
        }
        else {
            console.error('Function not found:', string);
        }
    };


    //
    //
    //
    pub.waitFor = function(key, value, timer, callback) {
        var nTimer = setInterval(function() {
            // wait for something to load...
            if (pub.checkKeyExists(key, value)) {
                callback();
                clearInterval(nTimer);
            }
        }, timer);
    };


    //
    // Check whether Object key exists
    //
    pub.checkKeyExists = function(obj, keys) {
        // If obj is falsy.
        if (!(!!obj)) return false;
        keys = typeof keys === 'string' ? keys.split('.') : keys;
        if (keys.length === 0) return true;
        return pub.checkKeyExists(obj[ keys.shift() ], keys);
    };


    //
    // Add useful metadata to an AJAX request.
    //
    pub.ajaxMetaValues = function(data, type) {
        var obj = {};

        //Member ID.

        // Add Environment details.
        obj.env = pub.getEnvType();
        obj.url = pub.getCurrentDomain();

        // Add submitted date/time value.
        obj.submitted = pub.getISOdate();
        obj.submittedTimestamp = pub.getTimestamp();

        if (type != 'formData') return obj;
        
        // Convert JS Object to FormData.
        return $.each(obj, function(key, value) {
            data.set(key, value);
        });
    };


    //
    // get form values as a key-value Object
    //
    pub.getFormValues = function($form, type) {
        var formData = new FormData($form[0]),
            groupedArrays = {};
        
        // Re-build certain field's values.
        $($form).find(':input').each(function() {
            var $element = $(this),
                key = $element.attr('name'),
                value = $element.val();
            
            // Re-build multi-select values.
            if ($element.is('select[multiple]')) {
                formData.set(key, value);
            }
            // Check if checkbox name ends with [].
            else if ($element.is(':checkbox:checked') && key.endsWith('[]')) {
                // Re-build checkbox values for grouped elements.
                var elementName = key.slice(0, -2);// Remove [].
                if (!groupedArrays[elementName]) {
                    groupedArrays[elementName] = [];// Create array if not present.
                }
                groupedArrays[elementName].push(value);
                formData.delete(key);// Remove the individual entry.
            }
        });
        // Merge rebuilt groupedArrays into formData.
        for (elementName in groupedArrays) {
            formData.set(elementName, groupedArrays[elementName]);
        }

        // Add metadata to formData:
        pub.ajaxMetaValues(formData, 'formData');

        // Debug:
        console.log(Object.fromEntries(formData));

        if (type == 'formData') {
            return formData;
        }
        if (type == 'json') {
            // Convert to JSON.
            return JSON.stringify(Object.fromEntries(formData));
        }
        // JS Object.
        return Object.fromEntries(formData);
    };


    //
    //
    //
    pub.sendAJAX = function(options, form) {
        var params = $.extend({
            //url: "",// Required and must be provided.
            //data: {},// Required and must be provided.
            method: "POST",
            timeout: 60000,
            success: function(data, textStatus) {
                console.log(textStatus, data);
                if (typeof params.callbackSuccess === "function") params.callbackSuccess(data);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log(textStatus, errorThrown);
                if (typeof params.callbackError === "function") params.callbackError(textStatus, errorThrown);
                
                // Generic error message.
                var data = {
                    "mode": "dialog",
                    "message": "[p]Sorry, something went wrong, please try again. if the problem continues, contact our team for help.[/p]",
                    "type": "error",
                    "enableForm": true,
                    "options": {
                        "title": "There was a problem...",
                        "overlayClose": false,
                        "actions": [
                            {
                                "type": "button",
                                "text": "OK",
                                "attributes": {
                                    "class": "button-primary trigger-lbox-close",
                                    "href": "#"
                                }
                            }
                        ]
                    }
                };
                if (pub.checkKeyExists(window.jQuery, "litbox")) {
                    MAIN.handleAjaxResponse(data, form || false);
                }
                else {
                    alert(data.message);
                }
            }
        }, options);
        $.ajax(params);
    };


    //
    //
    //
    pub.parseIfStringJSON = function(str) {
        if (typeof str === 'string') {
            str = str.trim();
            if (str[0] == '{' && str[str.length - 1] == '}') {
                return JSON.parse(str);
            }
        }
        return str;
    };


    //
    // Manage cookies.
    //
    pub.setCookie = function(name, value, days) {
        var expires = "";
        
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    };
    pub.getCookie = function(name) {
        var nameEQ = name + "=",
            cookies = document.cookie.split(';');
        
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            if (cookie.indexOf(nameEQ) === 0) {
                return pub.parseIfStringJSON(cookie.substring(nameEQ.length));
            }
        }
        return null;
    };
    pub.deleteCookie = function(name) {
        document.cookie = name+'=; expires=Thu, 01-Jan-70 00:00:01 GMT; path=/';
    };
    

    //
    // On DOM ready.
    //
    // $(function() {});

    
    return pub;
}(jQuery, this, this.document));

