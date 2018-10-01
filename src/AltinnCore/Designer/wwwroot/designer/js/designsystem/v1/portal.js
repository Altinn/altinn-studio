var addListExpandHandler = function() {
  $('.a-list *[data-toggle="collapse"]').on('click', function() {
    // This script runs before the bootstrap collapse handler, so the collapsed-class will still be
    // present even though the content is about to be expanded
    if ($(this).hasClass('collapsed')) {
      $(this).closest('li').addClass('a-expanded');
    } else {
      $(this).closest('li').removeClass('a-expanded');
    }
  });
};

/* globals $ */
var aTagSpaceExpand = function() {
  $('a.collapsed').each(function() {
    $(this).on('keydown', function(e) {
      if (e.keyCode === 32 || e.keycode === 13 || e.which === 32 || e.which === 13) {
        e.stopPropagation(); e.preventDefault();
        $(e.target).trigger('click');
      }
    });
  });
};

var setupOnKeypress = function() {
  $('.a-clickable, .a-selectable').on('keypress', function(e) {
    var key = e.which;
    if (key === 13) {
      $(this).click();
      return false;
    }

    return true;
  });
};

var compareTo = function(firstItem, secondItem) {
  var first;
  var second;
  if (firstItem === undefined && secondItem === undefined) {
    return 0;
  }
  if (firstItem === undefined) {
    return 1;
  }
  if (secondItem === undefined) {
    return -1;
  }

  first = firstItem.toString();
  second = secondItem.toString();
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }
  return 0;
};

/* globals $ */
var handleFocus = function() {
  // If state on input is 'focus', add class to a-input: 'a-input-focus'
  $('input.form-control').focus(function() {
    $(this).parent().addClass('a-input-focus');
  }).blur(function() {
    $(this).parent().removeClass('a-input-focus');
  });
  $('.a-radioButtons-stackedList').find('input[type=radio]').change(function() {
    var me = $(this);
    if (me.is(':checked')) {
      me.parent().addClass('a-js-radioParentGray');
      $('input[type=radio]').each(function() {
        if ($(this).attr('id') !== me.attr('id') &&
          $(this).attr('name') === me.attr('name')) {
          $(this).parent().removeClass('a-js-radioParentGray');
        }
      });
    }
  });
  // Prevent focus state styling on click
  $('body').on('mousedown', '*:not(input):not(textarea)', function(e) {
    e.stopPropagation();
    if ($(e.target).prop('nodeName') !== 'A' &&
      $(e.target).prop('nodeName') !== 'BUTTON' &&
      $(e.target).prop('nodeName') !== 'LABEL') {
      if ($(e.target).parent().prop('nodeName') === 'A' ||
        $(e.target).parent().prop('nodeName') === 'BUTTON' ||
        $(e.target).parent().prop('nodeName') === 'LABEL') {
        $(e.target).parent().trigger('mousedown');
      }
    }
    // Accomodate for popovers
    if ($(this).attr('data-toggle') !== 'popover' && !$(this).is('i')) {
      if (!$(this).hasClass('a-custom-select')) {
        $(this).addClass('override-focus');
        setTimeout(function() {
          this.blur(); this.removeClass('override-focus');
        }.bind($(this)), 1500);
      }
    }
    $(this).children('.custom-control-indicator').addClass('override-focus');
    setTimeout(function() {
      this.children('.custom-control-indicator').prev().blur();
      this.children('.custom-control-indicator').removeClass('override-focus');
    }.bind($(this)), 1500);
    $(this).children('.a-switch-label').addClass('override-focus');
    setTimeout(function() {
      this.children('.a-switch-label').prev().blur();
      this.children('.a-switch-label').removeClass('override-focus');
    }.bind($(this)), 1500);
    setTimeout(function() {
      $('.a-switch-label').prev().blur();
      $('.a-switch-label').removeClass('override-focus');
    }, 1500);
  });
};

/* globals $ */
var initializeDatepicker = function() {
  $('.form-control.date').datepicker({
    format: 'dd.mm.yyyy',
    language: 'no',
    todayHighlight: true,
    orientation: 'bottom left',
    autoclose: true,
    maxViewMode: 0
  }).on('show', function(e) {
    $('.datepicker').find('.next').html('');
    $('.datepicker').find('.prev').html('');
    $('.datepicker').find('table').attr('cellpadding', '0');
    $('.datepicker').find('table').attr('cellspacing', '0');
    $('.datepicker').each(function() {
      if ($(this).find('.today').html().indexOf('<span') === -1) {
        $(this).find('.today')
          .html('<span>' + $(this).find('.today').html() + '</span>');
      }
      if ($(this).find('.active').html().indexOf('<span') === -1) {
        $(this).find('.active')
          .html('<span>' + $(this).find('.active').html() + '</span>');
      }
    });
  });
  $('body').on('click', function(e) {
    $('.datepicker').hide();
  });
  $('.form-control.date').on('change', function() {
    $('.datepicker').each(function() {
      if ($(this).find('.today').html().indexOf('<span') === -1) {
        $(this).find('.today')
          .html('<span>' + $(this).find('.today').html() + '</span>');
      }
      if ($(this).find('.active').html().indexOf('<span') === -1) {
        $(this).find('.active')
          .html('<span>' + $(this).find('.active').html() + '</span>');
      }
    });
  });
  $('.form-control.date').datepicker('setDate', new Date());
  $('.form-control.date').on('click', function(e) {
    e.stopPropagation(); e.preventDefault();
  });
  $('.datepicker').on('click', function(e) {
    e.stopPropagation(); e.preventDefault();
  });
};

/* globals compareTo */
var sortListAlphanumerically = function(src, sortIndex) {
  var $list = $(src).closest('ul');
  var rows = $list.find('li:not(.a-list-header)');
  $(src).closest('.a-list').find('.a-list-sortHeader').removeClass('a-active');
  $(src).addClass('a-active');
  rows.sort(function(a, b) {
    var A = $($($($(a).children()[0]).children()[sortIndex]).find('.a-js-sortValue')[0]).text()
      .toUpperCase();
    var B = $($($($(b).children()[0]).children()[sortIndex]).find('.a-js-sortValue')[0]).text()
      .toUpperCase();
    return compareTo(A, B);
  });

  $.each(rows, function(index, row) {
    $list.append(row);
  });
};

var addListSortHandler = function() {
  $('.a-list .a-list-sortHeader').on('click', function() {
    var index = $(this).index();
    sortListAlphanumerically(this, index);
  });

  $('.a-list').each(function() {
    var sortHeader = $('.a-list-sortHeader')[0];
    var index = $(sortHeader).index();
    sortListAlphanumerically(sortHeader, index);
  });
};

/* globals $ */
var mobileNavigation = function() {
  $('.ap-sideNav-mobilebar').click(function() {
    var self = $(this);
    var searchButton = $('.a-toggle-search').hasClass('show');
    if (self.hasClass('show')) {
      $('.ap-sideNav-collapse').slideUp(300); self.removeClass('show');
    } else {
      if (searchButton === true) {
        $('.a-search').slideUp(300); $('.a-toggle-search').removeClass('show');
      }
      self.addClass('show'); $('.ap-sideNav-collapse').slideDown(300);
    }
    return false;
  });
  window.langTriggerClick = function(e) {
    var key = e.which;
    if (key === 13) {
      $(e.target).trigger('mousedown');
    } else if (key === 9) {
      if (!$('#exCollapsingNavbar').find('.a-dropdown-languages').hasClass('expand')) {
        $('#exCollapsingNavbar').find('.a-dropdown-languages').find('a').attr('tabindex', '-1');
      } else {
        $('#exCollapsingNavbar').find('.a-dropdown-languages').find('a').attr('tabindex', '0');
      }
    }
  };
};

/* globals $ */
var popover = function() {
  var options = {
    html: true,
    placement: function(context, source) {
      var position = $(source).offset();
      if ($(source).hasClass('a-js-popoverBig')) {
        return 'bottom';
      }
      if (position.left < 125) {
        return 'right';
      }
      if (position.left > ($(document).width() - $(source).width() - 125)) {
        return 'left';
      }
      return 'bottom';
    },
    content: function() {
      if ($(this).attr('data-popover-content')) {
        return $('#' + $(this).data('popover-content')).html();
      }
      return false;
    },
    trigger: 'click'
  };
  function adjustBig() {
    if ($('.popover-big').length > 0) {
      $('.popover-big').attr('style',
        $('.popover-big').attr('style').replace(
          /translateX\(.*?\)/, 'translateX(0px)'
        )
      );
    }
  }
  $('[data-toggle="popover"]').each(function() {
    if ($(this).attr('data-template')) {
      $(this).attr('data-template', $(this).attr('data-template').replace(/<!--[\s\S]*?-->/g, ''));
    }
  });
  $('[data-toggle="popover"]').popover(options);
  $('#example').popover();
  $('.a-js-togglePopoverIcons').each(function() {
    $(this).find('i').eq(1).hide();
  });
  $('.a-js-blurrablePopover').on('blur', function(e) {
    if ($(e.target).find('i').eq(1).is(':visible')) {
      $(e.target).trigger('click');
    }
  });
  $('body').on('mouseup', '.bs-tether-element *', function(e) {
    e.preventDefault(); e.stopPropagation();
  });
  $('body').on('mouseup', '.bs-tether-element', function(e) {
    e.preventDefault(); e.stopPropagation();
  });
  $('.a-js-togglePopoverIcons').on('shown.bs.popover', function(e) {
    $(e.target).find('i').eq(0).hide(); $(e.target).find('i').eq(1).show();
  });
  $('.a-js-togglePopoverIcons').on('hidden.bs.popover', function(e) {
    $(e.target).find('i').eq(0).show(); $(e.target).find('i').eq(1).hide();
  });
  $('.a-js-persistPopover').on('shown.bs.popover', function() {
    adjustBig();
    // $('.popover-big').find('.popover-arrow').css(
    //   'left', ($(this).offset().left + 9) + 'px'
    // );
    // $('.popover-big').attr('data-arrowleftadjust', ($(this).offset().left + 9) + 'px');
    $('body').append(
      '<style>.popover-big:after { left: ' + ($(this).offset().left + 10.5) + 'px !important; }</style>');
    $('html, body').animate({
      scrollTop: $('.a-js-persistPopover').offset().top - 50
    }, 250);
  });
  $(window).scroll(adjustBig); $(window).resize(adjustBig);
};

/* globals $ */
var propagateContent = function() {
  $('.a-js-propagatedContentDestination').each(function() {
    var prefix = '.a-js-propagatedContentOrigin.';
    if ($(this).hasClass('replace-me')) {
      $(this).before($(prefix + $(this).attr('data-refclass')).html());
      $(this).remove();
    } else {
      $(this).html($(prefix + $(this).attr('data-refclass')).html());
    }
  });
};

/* globals $ */
var toggleExpand = function() {
  $('.js-toggle').click(function() {
    var self = $(this);
    if (self.hasClass('show')) {
      self.parent().find('.js-hide').slideUp(300);
      self.removeClass('show');
    } else {
      self.addClass('show');
      self.parent().find('.js-hide').slideDown(300);
    }
    return false;
  });
};

/* globals $ */
var toggleFilter = function() {
  $('.a-collapse-title').on('keyup', function(e) {
    var key = e.which;
    if (key === 13) {
      e.stopImmediatePropagation(); e.stopPropagation(); e.preventDefault();
      $(e.target).trigger('mouseup');
    } else if (key === 9) {
      if ($($(e.target).attr('data-target')).hasClass('show')) {
        $($(e.target).attr('data-target')).find('.a-switch').eq(0)
          .trigger('focus');
      }
    }
  });
};

/* globals $ */
var tooltip = function() {
  $('[data-toggle="tooltip"]').tooltip();
};

/* globals questionnaireInteraction, drilldownInteraction, handleFocus,
mobileNavigation, propagateContent, toggleExpand, toggleFilter, uniformHeight,
tooltip, popover, aTagSpaceExpand, initializeDatepicker, onboarding,
nameChecker, codeLookup, handleValidatorLibrary,
defaultSort, setupAddRightsHandler, onFileInputChange, toggleInstant, switchForm,
addListExpandHandler,
addListSortHandler, setupListRowSelect, setupOnKeypress,
genericSearch, formatOrgNr */

window.sharedInit = function() {
  addListExpandHandler();
  aTagSpaceExpand();
  setupOnKeypress();
  handleFocus();
  initializeDatepicker();
  addListSortHandler();
  mobileNavigation();
  popover();
  propagateContent();
  toggleExpand();
  toggleFilter();
  tooltip();
};
window.sharedInit();

/* globals $ */
var formatOrgNr = function() {
  $('.a-js-orgNr').on('keyup', function() {
    var number;
    this.value = this.value.replace(/ /g, '');
    number = this.value;
    this.value = number.replace(/(.{3})/g, '$1 ').trim();
  });
};

/* globals goBack */
var onConfirmDeletionClick = function() {
  var $list = $('ul[data-list-selectable="true"]');
  var $segmentDone = $('.segment-done');
  var goToReceipt = false;

  if ($list.find('li.a-selected:not(.a-list-header)').length === $list.find('li:not(.a-list-header)').length) {
    goToReceipt = true;
  } else {
    $list.find('li.a-selected')
      .addClass('a-deleted')
      .addClass('a-disabled')
      .removeClass('a-selected')
      .removeAttr('tabindex');
    $segmentDone.hide();
  }

  return goToReceipt;
};

var handleModalClose = function(src, targetUrl) {
  var hasSelectedRows = $('ul[data-list-selectable="true"] li.a-selected:not(.a-list-header)').length > 0;
  if (!hasSelectedRows) {
    $(src).popover('disable');
    location.href = targetUrl;
  }
};

var setupListRowSelect = function() {
  var $list = $('ul[data-list-selectable="true"]');
  var $segmentDone = $('.segment-done');

  $list.on('click', 'li:not(.a-list-header)', function() {
    if (!$(this).hasClass('a-deleted')) {
      $(this).toggleClass('a-selected');
      if ($list.find('li.a-selected').length > 0) {
        $segmentDone.show();
      } else {
        $segmentDone.hide();
      }
    }
  });

  $('.a-js-add-remove-all').on('click', function() {
    if ($list.find('li.a-selected:not(.a-list-header)').length === $list.find('li:not(.a-list-header)').length) {
      $list.find('li:not(.a-list-header)').removeClass('a-selected');
      $segmentDone.hide();
    } else {
      $list.find('li:not(.a-list-header)').addClass('a-selected');
      $segmentDone.show();
    }
  });

  $('.a-js-cancel-deletion').on('click', function() {
    $list.find('li:not(.a-list-header)').removeClass('a-selected');
    $segmentDone.hide();
  });
};

/*
Search datatable with highlight using external package mark.js
*/
var mark = function() {
  var input = $(this).val();
  var options = {
    // comment out to ignore html tags in searchable strings
    // ie: string1 <tag>string2</tag>
    separateWordSearch: false
  };

  $.each(this.dataset.searchTarget.split(','), function() {
    // Reset visibility of all rows
    var target = '#' + this.toString();

    $(target + ' li:not(.a-js-ignoreDuringSearch):not(.a-list-header)').show();

    $(target).find('*[data-searchable="true"]').unmark().mark(input, options);

    // Hide unmarked rows
    if (input.length > 0) {
      $(target + ' li:not(.a-js-ignoreDuringSearch):not(.a-list-header)').each(function() {
        if ($(this).find('mark').length === 0) {
          $(this).hide();
        }
      });
    }
  });
};

var initSearchWithHighlight = function() {
  $('input[data-search-algorithm="show-and-highlight"]').on('input', mark);
};

$(document).on('ready', function() {
  var $allWithTarget = $('.switch-container input[data-switch-target]');
  var allTargets = [];

  $.each($allWithTarget, function() {
    $.each($(this).data('switch-target'), function() {
      allTargets.push(this + '');
    });
  });

  $allWithTarget.on('click', function() {
    var $currentSwitch = $(this);
    var switchTargets = $currentSwitch.data('switch-target');

    $.each(switchTargets, function() {
      $('#' + this).show();
    });

    $.each(allTargets, function() {
      var hide = true;
      var outerTarget = this + '';

      $.each(switchTargets, function() {
        var innerTarget = this + '';
        if (outerTarget === innerTarget) {
          hide = false;
        }
      });

      if (hide) {
        $('#' + this).hide();
      }
    });
  });
});

/* globals
  formatOrgNr,
  onConfirmDeletionClick,
  setupListRowSelect,
  initSearchWithHighlight
*/
window.portalInit = function() {
  formatOrgNr();
  onConfirmDeletionClick();
  setupListRowSelect();
  initSearchWithHighlight();
};
window.portalInit();
