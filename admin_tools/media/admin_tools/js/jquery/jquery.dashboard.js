/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */

/**
 * Dashboard plugin.
 * This plugin is not yet released, but should be when it will be finished.
 *
 * copyright (c) 2010 David Jean Louis <izimobil@gmail.com>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 */

(function(jQuery) {

    jQuery.fn.extend({
        //pass the options variable to the function
        dashboard: function(options) {
            //Set the default values, use comma to separate the settings, example:
            var defaults = {
                panel_id: 'dashboard-panel',
                dashboard_id: this.attr('id'),
                dashboard_module_class: 'dashboard-module',
                columns: 2
            }    
            var options = jQuery.extend(defaults, options);

            return this.each(function() {
                // set ids for dashboard modules
                _initialize(jQuery(this), options);
                // restore positions, must be done *before* columnize
                _restore_positions(jQuery(this), options);
                // columnize the dashboard modules
                _columnize(jQuery(this), options);
                // add draggable behaviour
                _set_draggable(jQuery(this), options);
                // add collapsible behaviour
                _set_collapsible(jQuery(this), options);
                // add deletable behaviour
                _set_deletable(jQuery(this), options);
                // add addable behaviour to dashboard panel items
                _set_addable(jQuery(this), options);
                // restore user preferences
                _restore_preferences(jQuery(this), options);
            });
        }
    });

    var preferences = false;
    var cookie_name = false;

    var _initialize = function(elt, options) {
        if (cookie_name === false) {
            cookie_name = 'admin-tools.' + options.dashboard_id;
        }
        if (preferences === false) {
            var json_str = jQuery.cookie(cookie_name);
            preferences = json_str ? JSON.parse(json_str) : {};
        }
        // set ids if not set
        elt.children('div[id!=' + options.panel_id +']').each(function(index) {
            if (!jQuery(this).attr('id')) {
                jQuery(this).attr('id', 'module_' + index);
            }
        });
    };

    var _restore_positions = function(elt, options) {
        // restore positions
        try {
            var saved_positions = _get_preference('positions');
        } catch (e) {
            return;
        }
        var current_positions = _get_positions(elt, options);
        var new_positions = [];

        for(var v = 0; v < current_positions.length; v++) {
            new_positions[current_positions[v]] = current_positions[v];
        }

        for(var i = 0; i < saved_positions.length; i++) {
            // item id from saved order
            var id = saved_positions[i];
            if (id in new_positions) {
                var item = new_positions[id];
                var child = elt.children('#'+item);
                // select the item according to the saved order
                var saved = elt.children('#'+item);
                child.remove();
                elt.append(saved);
            }
        }
    };

    var _columnize = function(elt, options) {
        var elts = elt.children('div[id!=' + options.panel_id +']');
        var size = Math.ceil(elts.length / options.columns);
        var sizes = _get_preference('columns');
        var percent = Math.floor(100 / options.columns);
        var start = 0;
        var stop = 0;
        for (i = 0; i < options.columns; i++) {
            if (!sizes[i]) {
                start = i * size;
                stop  = start + size;
            } else {
                start = (i == 0) ? 0 : sizes[i-1];
                stop  = start + sizes[i];
            }
            elts.slice(start, stop).wrapAll(
                '<div class="dashboard-column" style="float:left;width:'+percent+'%;"/>'
            );
        }
    };

    var _restore_preferences = function(elt, options) {
        elt.children().children('.disabled').each(function() {
            _delete_element(jQuery(this), options);
        });
        if (preferences['disabled']) {
            jQuery.each(preferences['disabled'], function(k, v) {
                v ? _delete_element(jQuery('#'+k), options) : _add_element(jQuery('#'+k), options);
            });
        }
        if (preferences['collapsed']) {
            jQuery.each(preferences['collapsed'], function(k, v) {
                if (v) {
                    _toggle_element(jQuery('#'+k), options);
                }
            });
        }
        // if there's no element in the panel, hide it
        if (!jQuery('#' + options.panel_id).find('li').length) {
            jQuery('#' + options.panel_id).hide();
        }
    };

    var _set_draggable = function(elt, options) {
        // the dashboard column
        elt.children('.dashboard-column').sortable({
            handle: 'h2',
            items: '.draggable',
            connectWith: '.dashboard-column',
            placeholder: 'dashboard-placeholder',
            forcePlaceholderSize: true,
            cursor: 'crosshair',
            opacity: 0.7,
            update: function() {
                _set_preference('positions', false, _get_positions(elt, options));
                var columns = [];
                elt.children('.dashboard-column').each(function() {
                    columns.push(jQuery(this).children().length);
                });
                _set_preference('columns', false, columns);
            }
        });
    };

    var _set_collapsible = function(elt, options) {
        elt.find('.collapsible h2').each(function() {
            jQuery(this).append('<a href="#" class="toggle-icon">Toggle</a>').find('a.toggle-icon').click(function() {
                var prnt = jQuery(this).parent().parent();
                _toggle_element(prnt, options, true);
            });
        });
    };

    var _toggle_element = function(elt, options, save_preference) {
        elt.find('h2 a.toggle-icon').toggleClass('collapsed');
        elt.children('div').slideToggle();
        if (save_preference) {
            _set_preference('collapsed', elt.attr('id'), elt.find('h2 a.toggle-icon').hasClass('collapsed'));
        }
    };

    var _set_deletable = function(elt, options) {
        elt.find('.deletable h2').each(function() {
            jQuery(this).append('<a href="#" class="close-icon">Close</a>').find('a.close-icon').click(function() {
                var prnt = jQuery(this).parent().parent();
                _delete_element(prnt, options, true);
            });
        });
    };

    var _delete_element = function(elt, options, save_preference) {
        var existing = jQuery('#'+options.panel_id).find('li a[rel='+elt.attr('id')+']');
        if (!existing.length) {
            var panel_ul = jQuery('#' + options.panel_id).find('ul');
            if (!panel_ul.length) {
                jQuery('#' + options.panel_id).append('<ul/>');
                panel_ul = jQuery('#' + options.panel_id).find('ul');
            }
            panel_ul.append(
                '<li><a href="#" rel="' 
                + elt.attr('id') 
                + '" class="addlink dashboard-module-add">'
                + elt.find('h2').contents().first().text() 
                + '</a></li>'
            );
            _set_addable(elt, options, jQuery('#'+options.panel_id).find('li a[rel='+elt.attr('id')+']'));
        } else {
            existing.parent().show();
        }
        elt.fadeOut('fast');
        jQuery('#' + options.panel_id).show();
        if (save_preference) {
            _set_preference('disabled', elt.attr('id'), true);
        }
    };

    var _set_addable = function(elt, options, elts) {
        if (!elts) {
            elts = jQuery('#'+options.panel_id).find('li a');
        }
        elts.click(function() {
            _add_element(jQuery('#'+jQuery(this).attr('rel')), options, true);
        });
    };

    var _add_element = function(elt, options, save_preference) {
        panel_elt = jQuery('#'+options.panel_id).find('li a[rel='+elt.attr('id')+']');
        panel_elt.parent().remove();
        elt.removeClass('disabled');
        elt.fadeIn('fast');
        if (save_preference) {
            _set_preference('disabled', elt.attr('id'), false);
        }
        // if there's no element in the panel, hide it
        if (!jQuery('#' + options.panel_id).find('li').length) {
            jQuery('#' + options.panel_id).hide();
        }
    };

    var _get_preference = function(cat, id, defaultval) {
        try {
            if (preferences[cat] == undefined) {
                preferences[cat] = {};
            }
            if (id) {
                return preferences[cat][id];
            }
            return preferences[cat];
        } catch (e) {
            return defaultval ? defaultval : null;
        }
    };

    var _set_preference = function(cat, id, val) {
        try {
            if (preferences[cat] == undefined) {
                preferences[cat] = {};
            }
            if (id) {
                preferences[cat][id] = val;
            } else {
                preferences[cat] = val;
            }
        } catch (e) {
        }
        jQuery.cookie(cookie_name, JSON.stringify(preferences), {expires: 1825});
    };

    var _get_positions = function(elt, options) {
        var modules = [];
        if (!elt.children('.dashboard-column').length) {
            elt.children('div[id!=' + options.panel_id +']').each(function() {
                modules.push(jQuery(this).attr('id'));
            });
        } else {
            elt.children('.dashboard-column').each(function() {
                jQuery.each(jQuery(this).sortable('toArray'), function(index, item) {
                    modules.push(item);
                });
            });
        }
        return modules;
    }

})(jQuery);
