//
//
//
var Bouncer,
    FORMS = (function($, window, document, undefined) {
    var pub = {};


    // Check or uncheck the custom Input and the actual (hidden) radio/checkbox input.
        // "checked" is a Boolean (to check or uncheck the fields).
    pub.toggleCustomInputField = function($customInput, $input, checked) {
        if ($customInput && ($customInput.hasClass('w--redirected-checked') !== checked)) {
            $customInput.trigger('click');
        }
        // Make sure the checkbox/radio reflects the same state as the custom input field...
        $input.prop('checked', checked);
    };


    //
    // AJAX form submit logic.
        // Used by ".form-submit" and ".bouncer" forms.
    //
    pub.ajaxSubmitHandler = (form, handlerOptions) => {
        var $form = $(form),
            $button = $form.find('.form-submit.clicked'),
            validation = $form.attr('data-validation'),
            dataType = $form.attr('data-form-values-type');

        // Custom form validation.
        if (validation && !HELP.callNestedFunction(validation)) {
            // Validation function retured false.
            console.log('Validation failed');
            MAIN.buttonThinking($button, true);
            // Don't proceed.
            return false;
        }

        var data = HELP.getFormValues($form, dataType),
            formIncrement = HELP.getCookie('form-valid'),
            i = 2;

        formIncrement = !!formIncrement ? Number(formIncrement) : 0;
        formIncrement = ++formIncrement;

        if (dataType == 'formData') {
            data.set('increment', formIncrement);
        }
        else {
            data.increment = formIncrement;
        }
        HELP.setCookie('form-valid', formIncrement);

        var ajaxParams = {
            url: $form.attr('action'),
            method: $form.attr('method'),
            data: data,
            timeout: 120000,
            callbackSuccess: function(data) {
                MAIN.thinking(false);
                MAIN.handleAjaxResponse(data, $form);
                // Extra callback for this function, not passed through to sendAJAX().
                if (handlerOptions && typeof handlerOptions.callbackSuccess === "function") {
                    handlerOptions.callbackSuccess(data);
                }
            },
            callbackError: function(data) {
                MAIN.thinking(false);
                console.log('error');
                // Extra callback for this function, not passed through to sendAJAX().
                if (handlerOptions && typeof handlerOptions.callbackError === "function") {
                    handlerOptions.callbackError();
                }
            }
        };
        // File upload fields break the JS without these settings.
        if (dataType == 'formData') {
            ajaxParams.processData = false;
            ajaxParams.contentType = false;
            ajaxParams.cache = false;
        }

        MAIN.buttonThinking($button);
        MAIN.thinking(true, false);
        console.log('data: ', ajaxParams.data);

        HELP.sendAJAX(ajaxParams, $form);
    };


    //
    // On DOM ready.
    //
    $(function() {
        //
        // Bouncer FE form validation.
        //
        // Add Bouncer form validation error placeholder for fields.
        //
        var bouncerFieldIndex = 0;
        $('.bouncer .input-wrapper').each(function(i, el) {
            var id = 'error-wrapper-'+ bouncerFieldIndex++;
            
            $(el).append( $('<div class="error-wrapper" id="'+ id +'" />') )
                .find(':input').attr('data-bouncer-target', '#'+ id)
        });

        //
        // Bouncer site-wide form validation.
            // Works for all forms with a ".bouncer" class.
        //
        pub.bouncer = new Bouncer('form.bouncer', {
            fieldClass: 'error',// Applied to fields with errors
            errorClass: 'error-text',// Applied to the error message for invalid fields
            fieldPrefix: 'bouncer-field_',
            errorPrefix: 'bouncer-error_',
            disableSubmit: true,
            customValidations: {
                editorMaxlength: function(field) {
                    // If the field isn't an .editor textarea, ignore it.
                    if (!$(field).hasClass('editor')) return false;
                    // Get the Editor iframe body.
                    var editor = $(field).parents('.input-wrapper').find('iframe').contents().find('body');
                    if (!editor) return false;
                    // Validate the iframe text() value is less than the maxlength attr.
                        // We use "data-valid-maxlength" and not "data-maxlength || maxlength" because
                        // the Editor adds HTML which increases the textarea character count so we
                        // validate the field's char count instead of setting a hard limit on it.
                    return editor.text().length > Number($(field).attr('data-valid-maxlength'));
                }
            },
            messages: {
                missingValue: {
                    checkbox: 'This field is required',
                    radio: 'Please select an option',
                    select: 'Please select an option',
                    'select-multiple': 'Please select one or more options',
                    default: 'This field is required'
                },
                patternMismatch: {
                    email: 'Please enter a valid email address',
                    url: 'Please enter a valid URL (Example: http://example.com)',
                    number: 'Please enter a number',
                    color: 'Please match the following format: #rrggbb',
                    date: 'Please use the YYYY-MM-DD format',
                    time: 'Please use the 24-hour time format (Example: 23:00)',
                    month: 'Please use the YYYY-MM format (Example: 2065-08)',
                    default: 'Please enter a value in the required format'
                },
                outOfRange: {
                    over: 'Value must not exceed {max} characters',
                    under: 'Value must not be lower than {min} characters'
                },
                // This uses the "maxlength" attr.
                wrongLength: {
                    over: 'Value must not exceed {maxLength} characters',
                    under: 'Value must not be lower than {minLength} characters'
                },
                // This uses the "data-valid-maxlength" attr.
                editorMaxlength: function(field) {
                    var max = Number($(field).attr('data-valid-maxlength'));
                    return 'Value must not exceed '+ max +' characters'
                },
                fallback: 'There was an error with this field'
            }
        });


        $(document)
        // Event listener for when a field is invalid/valid.
        .on('bouncerShowError bouncerRemoveError', function(e) {
            // Add and remove an error class on the field wrapper.
            $(e.target).parents('.input-wrapper').toggleClass('error',
            (e.type == 'bouncerShowError'));
        })
        // Form is valid event listener.
        .on('bouncerFormValid', function(e) {
            // Form is valid so submit it.
            let form = event.target;

            if ($(form).hasClass('ajax')) {
                // AJAX Form is valid so submit it.
                pub.ajaxSubmitHandler(form);
            }
            else {
                // Native form submit.
                form.submit();
            }
        });

        //
        // AJAX Form submit listener.
            // If you want to AJAX submit a form without Bouncer.js
            // add this class to a form.
        // Otherwise, add ".bouncer" class and pub.ajaxSubmitHandler()
            // gets called when the form validates.
        //
        $('.ajax-submit')
            .on('click', '.form-submit', function(e) {
                $(e.target).addClass('clicked');
            })
            .on('submit', function(e) {
                e.preventDefault();
                // Submit form via AJAX.
                pub.ajaxSubmitHandler(event.target);
            });


        //
        // Set custom Radio/Checkbox states on page load.
        // Check custom Radio/Checkbox field's hidden <input> if the custom field is set the "checked".
            // IMPORTANT! Do this after the $('.input-default-value').each() (above) to check a value
            // if there's no .input-default-value set.
        //
        $('.w-form-formradioinput--inputType-custom').each(function() {
            var $customInput = $(this),
                $input = $customInput.siblings(':input'),
                checked = $customInput.hasClass('w--redirected-checked');

            // Update radio/checkbox state.
            if (checked) {
                pub.toggleCustomInputField($customInput, $input, checked);
            }
        });


        // Format Email on keydown/change to:
            // Lowercase String.
            // Remove whitespace.
            // Remove certain special characters.
            // set "stripChars" to false to format but not remove characters.
        //
        $(document)
            // "change" is to cleanup autocompete values.
            .on('keydown change', '.format-email', function(e, stripChars) {
                var val = $(this).val() || '',
                    key = HELP.getKey(e);

                val = val.toString().toLowerCase()
                    .replace(/\s+/g, ''); // Remove whitespace

                if (key == ' ') {
                    // Prevent adding whitespace.
                    e.preventDefault();
                    return;
                }
                if (stripChars !== false) {
                    // Remove illegal characters
                    val = val.replace(/[^a-z0-9+\-_.@]/gi, '');
                }
                else if (/[^a-z0-9+\-_.@!()]/gi.test(val)) {
                    // Unset val if it has illegal characters on page load.
                    val = '';
                }
                $(this).val(val.trim());
            });
        $('.format-email').each(function() {
            $(this).trigger('change', false);
        });
        

        //
        // Populate select fields with Collection List item values.
            // Keep the following 4 functions in this order to prevent a bug
            // with the select2 fields and setting default values and saving values.
        //
        $('.select-list-options').buildSelectOptions();// #1


        //
        // Form fields: Populate field's default values with inline attribute's value.
        //
        $(':input[data-default-value]').inputAttrDefaultValue();// #2
        

        //
        // Form fields: Populate field's default values with sibling DIV's content.
        //
        $('.input-default-value').inputDefaultValue();// #3
    });

    return pub;
}(jQuery, this, this.document));



//
// Extend jQuery.
//
//
// Form fields: Populate field's default values with inline attribute's value.
//
$.fn.inputAttrDefaultValue = function() {
    $(this).each(function() {
        var $el = $(this),
            val = $el.attr('data-default-value');

        if (!$el.val()) {
            // Remove non-number characters from value so it can be set as a value.
            if ($el.attr('type') == 'number') {
                val = HELP.removeNonNumeric(val);
            }
            $el.val(HELP.sanitizeHTML(val, false, false)).trigger('change');
        }
    })
};


//
// Form fields: Populate field's default values with sibling DIV's content.
//
$.fn.inputDefaultValue = function() {
    $(this).each(function() {
        var $el = $(this),
            text = $el.text(),
            $input = $el.parents('.input-wrapper').find(':input'),
            type = $input.eq(0).attr('type');

        if (type == 'checkbox' || type == 'radio') {
            $input.each(function() {
                var $customInput = $(this).siblings(`.w-${type}-input`),
                    // If text of the .input-default-value matches the radio's value.
                    bool = !!text && text == $(this).val();

                if (type == 'checkbox') {
                    // bool value can either be empty, for non-Switch WF fields
                    //or "true/false" (String), for Switch WF fields.
                    bool = !!text && text !== "false";
                }
                // Update radio/checkbox state.
                FORMS.toggleCustomInputField($customInput, $(this), bool);
            });
        }
        else if (!$input.val()) {
            if ($input.hasClass('editor')) {
                // Add raw HTML to input (textarea.editor).
                $input.val($el.html());
            }
            else {
                // Add basic text with newlines.
                $input.val( HELP.stripHTMLWithLinebreaks($el.html()) );
            }
            $input.trigger('change');
        }
    });
};


//
// Form fields: Populate select with option elements built from WF Collection List data.
//
$.fn.buildSelectOptions = function(options) {
    options = options || {};

    $.each(this, function(i, el) {
        var wrapper = $(this).parent('.select-list-wrapper'),
            $select = $('select', wrapper),
            $default = $('.input-default-value', wrapper),
            // defaultValue = !!$default.text() ? $default.text() : $default.attr('data-value'),
            defaultValue = $default.attr('data-value') ? $default.attr('data-value') : $default.text(),
            values = [],
            isMultiSelect = $select.is('select[multiple]');

        if (isMultiSelect) {
            defaultValue = $('.w-dyn-item', $default).map(function() { return $.trim($(this).text()) });
        }
        else {
            defaultValue = $.trim(HELP.sanitizeHTML(defaultValue)) || '';
        }
        $(this).find('.w-dyn-item').each(function() {
            var $enItem = $(this).find('.no-translate'),
                enVal = $enItem.text();

            $(this).data('lang-en', enVal);// Store a non-translated string in .data().
            $enItem.remove();// Remove the English text so it doesn't get added in the <option>.

            var val = $.trim($(this).text()),
                selected = (val == defaultValue) ? 'selected' : false;

            if (isMultiSelect) {
                selected = ($.inArray(val, defaultValue) > -1);
            }
            if (!val || $.inArray(val, values) > -1) return;// Skip empty or duplicate values.
            values.push(val);

            $('<option />', {
                value: enVal,
                selected: selected
            }).text(val).appendTo($select);
        });
        $select.trigger('change');

        if ($select.hasClass('select2-field')) {
            $select.createSelect2();
        }
    });
};


//
// Form element has value/is selected or is checked, selector ":selectedInput".
//
jQuery.expr[':'].selectedInput = (el, i, m) => {
    var exclude = ['submit', 'button', 'reset', 'hidden'];

    if (el.type == 'checkbox' || el.type == 'radio') {
        return el.checked;
    }
    else if (exclude.indexOf(el.type) < 0) {
        return el.value;
    }
    return false;
};



