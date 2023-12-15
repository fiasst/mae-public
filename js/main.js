//
//
//
var MAIN = (function($, window, document, undefined) {
    var pub = {};


    //
    //
    //
    pub.handleAjaxResponse = function(data, form) {
        pub.dialog(data);
        
        if (HELP.checkKeyExists(data, 'callback')) {
            HELP.callNestedFunction(data.callback, data, form);
        }
        if (form && HELP.checkKeyExists(data, "enableForm") && !!data.enableForm) {
            // Revert button back to default, enabled button.
            pub.buttonThinking(form.find('.form-submit'), true);
        }
    };


    //
    // Display information and optional action buttons in various dialog UI options.
    //
    pub.dialog = function(data) {
        if (HELP.checkKeyExists(data, "mode")) {
            switch (data.mode) {
                case 'alert':
                    // Need to sanitize this...
                    // alert(HELP.sanitizeHTML(data.message));
                    break;

                case 'banner':
                    // Nothing to see yet.
                    break;

                case 'dialog':
                    pub.openDialog(data);
            }
        }
    };


    //
    //
    //
    pub.openDialog = (params) => {
        var actions;
        if (HELP.checkKeyExists(params, "options.actions")) {
            actions = $('<div class="actions justify-center" />');

            $.each(params.options.actions, function(i, item) {
                item.attributes.class = item.attributes.class || '';
                if (item.type == 'button') {
                    item.attributes.class += ' w-button small';
                }
                actions.append(
                    $('<a>', {
                        text: item.text,
                        attr: HELP.sanitizeAttrs(item.attributes)
                    })
                );
            })
        }
        var defaults = {
            bodyClasses: 'lbox-dialog',
            html: [HELP.tokenHTML(params.message), actions],
            css: {
                xxs: {
                    offset: 20,
                    maxWidth: 650,
                    contentInnerPadding: 20
                }
            }
        };

        HELP.waitFor(window.jQuery, 'litbox', 100, function() {
            // Litbox.
            $.litbox( $.extend(true, {}, defaults, params.options) );
        });

        $(document)
            .one('click', '.trigger-lbox-close', function(e) {
                if ($(this).attr('href') == '#') {
                    e.preventDefault();
                }
                $.litbox.close();
            })
            // Don't combine the close and reload classes or reload won't work.
            .one('click', '.trigger-reload', function(e) {
                e.preventDefault();
                
                if ($('body').hasClass('litbox-show')) {
                    $.litbox.close();
                }
                pub.thinking(true);
                
                // Reload the URL without including the hash.
                    // The Hash prevents the page reloading.
                    // And it'll launch a Litbox on page load if it finds an ID matching the hash.
                window.location = window.location.href.split('#')[0];
            });
    };


    //
    //
    //
    pub.thinking = (show, overlay = false) => {
        let classes = show ? (overlay ? 'thinking-overlay' : 'thinking') : 'thinking-overlay thinking';
        $('body').toggleClass(classes, show);
    };


    //
    //
    //
    pub.buttonThinking = function(btn, revert) {
        if (btn.length < 1) return false;

        if (!revert) {
            // Disable the button.
            btn.attr('disabled', true).addClass('thinking');
            if (btn.get(0).nodeName == 'BUTTON') {
                btn.attr('data-value', btn.text()).text(btn.attr('data-wait'));
            }
            else {
                btn.attr('data-value', btn.attr('value')).attr('value', btn.attr('data-wait'));
            }
        }
        else {
            // Revert the button back to initial state.
            btn.removeAttr('disabled').removeClass('thinking clicked');
            if (btn.get(0).nodeName == 'BUTTON') {
                btn.text(btn.attr('data-value'));
            }
            else {
                btn.attr('value', btn.attr('data-value'));
            }
        }
    };


    //
    //
    //
    pub.openLitbox = (params) => {
        var defaults = {
                title: false,
                // href: '#',
                inline: true,
                returnFocus: false,
                trapFocus: false,
                overlayClose: false,
                escKey: false,
                css: {
                    xxs: {
                        offset: 20,
                        maxWidth: 900,
                        width: '100%',
                        opacity: 0.4
                    },
                    sm: {
                        offset: '5% 20px'
                    }
                },
                onComplete: function() {
                    // If the Litbox contains Editor WYSIWYGs.
                    if (!!$('#litbox textarea.editor').length) {
                        // Wait for the tinyMCE to load.
                        HELP.waitFor(window, 'tinymce', 50, function() {
                            // Rebuild Editors after a small delay.
                            $('#litbox textarea.editor').initEditor();
                        });
                    }

                    // Set any form field default values.
                    $('#litbox :input[data-default-value]').inputAttrDefaultValue();
                    $('#litbox .input-default-value').inputDefaultValue();

                    // Fire optional onComplete callback.
                    if (typeof params.onComplete === "function") params.onComplete();
                },
                onCleanup: function() {
                    // If the Litbox contains Editor WYSIWYGs.
                    if (!!$('#litbox textarea.editor').length) {
                        // Wait for the tinyMCE to load.
                        if (window.tinymce) {
                            // Remove existing Editors because they don't display properly.
                                // This was a 2 day bug. Best solution was to rebuild them
                                // when Litbox finished opening. The editor loaded but the
                                // iframe <head> and <body> were both blank...
                            // TODO: This removes all Editors which needs fixing next.
                            tinymce.remove();
                        }
                    }
                    // Fire optional onCleanup callback.
                    if (typeof params.onCleanup === "function") params.onCleanup();
                }
            };

        HELP.waitFor(window.jQuery, 'litbox', 100, function() {
            // Litbox.
            $.litbox( $.extend(true, {}, defaults, params) );
        });
    };


    //
    // On DOM ready.
    //
    $(function() {
        //
        // Check if URL hash exists as an element's ID on page load.
            // IMPORTANT! Do this last so all HTML show/hide attribute logic can decide whether to remove
            // the target element first. Eg: [data-ms-perm="can:moderate"] or [data-ms-content="business"].
        //
        var hashAutoTrigger = function() {
            if (!!window.location.hash) {
                var hash = HELP.sanitizeHTML(window.location.hash);
                // If there's a location hash longer than simply "#" in the URL
                // AND the element exists on the page.
                if (hash.length > 1 && !!$(hash).length) {
                    // Look for an inline Litbox trigger and click the first instance.
                    $(`.trigger-lbox[href="${hash}"]:eq(0)`).trigger('click');
                    // Tab trigger.
                    $(`.w-tab-menu .w-tab-link[href="${hash}"]`).trigger('click');
                }
            }
        }();


        //
        // General Litbox trigger handler.
        //
        $(document).on('click', '.trigger-lbox', function(e) {
            e.preventDefault();

            // Open Litbox.
            pub.openLitbox({
                title: $(this).attr('data-title'),
                href: $(this).attr('href')
            });
        });


        //
        // Toggle element visibility.
        //
        $(document).on('click', '.toggle-vis', function(e) {
            var target = HELP.sanitizeHTML($(this).attr('href'));

            if (!!target.length) {
                e.preventDefault();
                $(this).toggleClass('active');
                $(target).toggleClass($(this).attr('data-toggle-class') || 'hide');
            }
        });


        //
        // Split content into steps, managed my classes and HTML attributes.
           // Used on the Add New Business Litbox.
        //
        $(document).on('click', '.js-next-step', function(e) {
            e.preventDefault();
            $(this).nextStep();
        });
        // Next step.
            // Usage: $('.some-button').nextStep();
        $.fn.nextStep = function() {
            $(this).parents('.js-steps').find('[class*="js-step-"]').addClass('hide')
                .filter('.js-step-'+ $(this).attr('data-step')).removeClass('hide');
        };
        // Reset steps back to step 1.
            // Usage: $('.wrapper-element').resetSteps();
        $.fn.resetSteps = function() {
            $(this).find('[class*="js-step-"]').addClass('hide')
                .filter('.js-step-1').removeClass('hide');
        };


        //
        // Cookie consent banner.
        //
        var $consentBanner = $('#cookie-consent');
        // Check if the consent cookie exists.
        if (!HELP.getCookie('fpj_consent')) {
            // Cookie not found, show the consent element.
            $consentBanner.removeClass('hide');
        }
        // Handle close button click
        $consentBanner.on('click', '.consent-close', function(e) {
            e.preventDefault();
            // Set the consent cookie to 'true'.
            HELP.setCookie('fpj_consent', 'true', 365);
            // Hide the consent element.
            $consentBanner.remove();
        });


        //
        // Gallery.
        //
        $('.thumb-gallery').litbox({
            href: function() {
                return $(this).find('img').attr('src');
            },
            rel: 'gallery'
        });
    });

    return pub;
}(jQuery, this, this.document));




//
// Extend jQuery.
//
//
// Case-insensitive selector ":icontains()".
//
jQuery.expr[':'].icontains = function(el, i, m, array) {
    return (el.textContent || el.innerText || "").toLowerCase().indexOf((m[3] || "").toLowerCase()) >= 0;
};


