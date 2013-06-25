// Generated by CoffeeScript 1.6.2
jQuery(function() {
  var App, AppRouter, AppStorage, Article, ArticleList, ArticleView, Feed, FeedList, FeedView, IndexItemView, IndexListView, Label, LabelList, LabelView, LabelsView, buildUrlHash;

  _.mixin({
    diff: function(a, b) {
      return {
        removed: _.difference(b, a),
        added: _.difference(a, b)
      };
    },
    truncate: function(s, limit) {
      var c, l, m, n;

      if (!limit || limit <= 0) {
        limit = 280;
      }
      l = s.length;
      if (l > limit / 2) {
        m = 0;
        n = 0;
        while (m < l && n < limit) {
          m++;
          c = s.charCodeAt(m);
          n++;
          if (c > 256 || c < 0) {
            n++;
          }
        }
        if (m < l) {
          return s.substring(0, m) + "...";
        }
      }
      return s;
    },
    prettyDate: function(time) {
      var days, seconds;

      seconds = (new Date().getTime() - new Date(time).getTime()) / 1000;
      days = Math.floor(seconds / 86400);
      if (isNaN(days) || days < 0) {
        return;
      }
      if (days === 0) {
        if (seconds < 60) {
          return "moments ago";
        } else if (seconds < 3600) {
          return "" + (Math.floor(seconds / 60)) + " minutes ago";
        } else {
          return "" + (Math.floor(seconds / 3600)) + " hours ago";
        }
      } else if (days === 1) {
        return "Yesterday";
      } else if (days < 7) {
        return "" + days + " days ago";
      } else if (days < 31) {
        return "" + (Math.ceil(days / 7)) + " weeks ago";
      } else if (days < 365) {
        return "" + (Math.ceil(days / 30.5)) + " months ago";
      } else {
        return "" + (Math.ceil(days / 365)) + " years ago";
      }
    }
  });
  _.templateSettings = {
    interpolate: /\<\@\=(.+?)\@\>/gim,
    evaluate: /\<\@(.+?)\@\>/gim,
    escape: /\<\@\-(.+?)\@\>/gim
  };
  _.extend(Backbone.Model.prototype, {
    mergeDelta: function(delta) {
      var base, count, field;

      for (field in delta) {
        count = delta[field];
        base = 0;
        if (this.has(field)) {
          base = this.get(field);
        }
        this.set(field, base + count);
      }
      return this;
    }
  });
  Feed = Backbone.Model.extend({
    defaults: function() {
      var defaults, field, label, _ref;

      defaults = {
        title: '',
        mute: false
      };
      _ref = App.stat_fields;
      for (field in _ref) {
        label = _ref[field];
        defaults.field = 0;
      }
      return defaults;
    },
    initialize: function() {
      var _this = this;

      return this.on('change', function() {
        var delta, field, label, _ref;

        delta = {};
        _ref = App.stat_fields;
        for (field in _ref) {
          label = _ref[field];
          delta[field] = _this.get(field) - _this.previous(field);
        }
        App.storage.allLabel.mergeDelta(delta);
        if (_this.mute) {
          Appl.storage.mutesLabel.mergeDelta(delta);
        }
        if (_this.get('categories') && _this.get('categories').length) {
          return _.each(_this.get('categories'), function(category) {
            App.storage.labels.get(category).mergeDelta(delta);
          });
        } else {
          return App.storage.othersLabel.mergeDelta(delta);
        }
      });
    },
    removeLabel: function(label) {
      var _this = this;

      if (App.storage.labels.get(label).isLocked()) {
        return;
      }
      return $.ajax({
        url: "" + API_URL + "/disable-tag?ck=" + ($.now()),
        type: 'POST',
        data: {
          "s": label
        }
      }).done(function(data) {
        var categories;

        categories = _this.get('categories');
        categories.splice(categories.indexOf(label), 1);
        _this.set('categories');
      });
    },
    markasread: function() {
      App.storage.mark(this, 'markasread');
    },
    getSortRank: function() {
      var field, rank, rank_weight, weight;

      rank_weight = {
        markasread: -1,
        read: 2,
        starred: 5
      };
      rank = 0;
      for (field in rank_weight) {
        weight = rank_weight[field];
        rank += this.get(field) * weight;
      }
      return rank;
    }
  });
  Label = Backbone.Model.extend({
    "default": function() {},
    lock: function() {
      return this.locked = true;
    },
    isLocked: function() {
      return this.locked;
    },
    unsubscribe: function() {
      var _this = this;

      if (this.locked) {
        throw "can not unsubscribe here";
      }
      return $.ajax({
        url: "" + API_URL + "/empty-tag?ck=" + ($.now()),
        type: 'POST',
        data: {
          "s": this.title
        },
        done: function(data) {
          var feed, _i, _len, _ref, _results;

          _ref = _this.get('feeds');
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            feed = _ref[_i];
            _results.push(App.storage.feeds.remove(feed));
          }
          return _results;
        }
      });
    },
    rename: function(new_name) {
      var old_name,
        _this = this;

      old_name = this.get('title');
      return $.ajax({
        url: "" + API_URL + "/rename-tag?ck=" + ($.now()),
        type: 'POST',
        data: {
          "s": old_name,
          "dest": new_name
        }
      }).done(function(data) {
        _this.set('title', new_name);
        return _this.get('feeds').forEach(function(feed) {
          var categories;

          categories = feed.get('categories');
          if (_.contains(categories, old_name)) {
            categories[categories.indexOf(old_name)] = new_name;
          }
        });
      });
    },
    addFeed: function(feed) {
      var delta;

      delta = _.pick.apply(_, [feed.attributes].concat(_.keys(App.stat_fields)));
      this.get('feeds').add(feed);
      this.mergeDelta(delta);
      return this;
    },
    getSortRank: function() {
      var field, rank, rank_weight, weight;

      rank_weight = {
        markasread: -1,
        read: 2,
        starred: 5
      };
      rank = 0;
      for (field in rank_weight) {
        weight = rank_weight[field];
        rank += this.get(field) * weight;
      }
      return rank;
    }
  });
  Article = Backbone.Model.extend({
    state_read: 'state/read',
    state_markasread: 'state/markasread',
    state_starred: 'state/starred',
    getFeed: function() {
      var feed;

      feed = App.storage.feeds.findWhere({
        id: this.get('origin').streamId
      });
      console.log(feed);
      return feed;
    },
    toggle: function(state, is_true) {
      var categories, category, delta, has_it, notify_data;

      delta = {};
      notify_data = {
        i: this.id
      };
      category = "state/" + state;
      categories = _.clone(this.get('categories'));
      has_it = _.contains(this.get('categories'), category);
      if (typeof is_true === 'undefined') {
        is_true = !has_it;
      }
      if (is_true) {
        if (!has_it) {
          delta[state] = 1;
          categories.push(category);
          notify_data.a = category;
        }
      } else {
        if (has_it) {
          delta[state] = -1;
          categories.splice(categories.indexOf(category), 1);
          notify_data.r = category;
        }
      }
      if (!_.isEmpty(delta)) {
        this.set({
          categories: categories
        });
        this.getFeed().mergeDelta(delta);
        $.ajax({
          url: "" + API_URL + "/edit-tag?ck=" + ($.now()),
          type: 'POST',
          data: notify_data
        });
      }
      return true;
    },
    is: function(state) {
      var category;

      category = "state/" + state;
      return _.contains(this.get('categories'), category);
    },
    isRead: function() {
      return this.is('read');
    },
    isMarkAsRead: function() {
      return this.is('markasread');
    },
    isStarred: function() {
      return this.is('starred');
    },
    getItemClass: function() {
      var klasses;

      klasses = [];
      if (this.isRead()) {
        klasses.push('read');
      }
      if (this.isStarred()) {
        klasses.push('starred');
      }
      if (this.isMarkAsRead()) {
        klasses.push('markasread');
      }
      return klasses.join(' ');
    }
  });
  ArticleList = Backbone.Collection.extend({
    model: Article,
    initialize: function(items, options) {
      var _this = this;

      this.page_size = options.page_size;
      this.continuation = options.continuation;
      this.stream = options.stream;
      this.loading = false;
      return this.on('article:current-change', function(id) {
        _this.currentId = id;
      });
    },
    getNext: function(id) {
      var index;

      index = -1;
      this.forEach(function(article, i) {
        if (article.get('id') === id) {
          index = i + 1;
          return false;
        }
      });
      if (index < 0) {
        return null;
      }
      if (index === this.length - 1) {
        this.loadMore();
      }
      return this.at(index);
    },
    getPrev: function(id) {
      var index;

      index = -1;
      this.forEach(function(article, i) {
        if (article.get('id') === id) {
          index = i - 1;
          return false;
        }
      });
      if (index < 0) {
        return null;
      }
      return this.at(index);
    },
    loadMore: function(onload) {
      this.loading = true;
      return App.storage.getItemsRemote(this, function() {
        this.loading = false;
        onload && onload();
      });
    },
    isLoading: function() {
      return this.loading;
    }
  });
  LabelList = Backbone.Collection.extend({
    model: Label,
    initialize: function() {},
    comparator: function(a, b) {
      var rank_a, rank_b;

      if (a.id === App.all_label_id) {
        return -1;
      }
      if (b.id === App.all_label_id) {
        return 1;
      }
      if (a.id === App.mutes_label_id) {
        return 1;
      }
      if (b.id === App.mutes_label_id) {
        return -1;
      }
      if (a.get('unread') === 0 && b.get('unread') > 0) {
        return 1;
      }
      if (a.get('unread') > 0 && b.get('unread') === 0) {
        return -1;
      }
      rank_a = a.getSortRank();
      rank_b = b.getSortRank();
      if (rank_a < rank_b) {
        return 1;
      }
      if (rank_a > rank_b) {
        return -1;
      }
      if (a.get('title') === b.get('title')) {
        return 0;
      } else if (a.get('title') > b.get('title')) {
        return 1;
      } else {
        return -1;
      }
    }
  });
  FeedList = Backbone.Collection.extend({
    model: Feed,
    initialize: function() {},
    comparator: function(a, b) {
      var rank_a, rank_b;

      if (a.get('mute') && !b.get('mute')) {
        return 1;
      }
      if (!a.get('mute') && b.get('mute')) {
        return -1;
      }
      if (a.get('unread') === 0 && b.get('unread') > 0) {
        return 1;
      }
      if (a.get('unread') > 0 && b.get('unread') === 0) {
        return -1;
      }
      rank_a = a.getSortRank();
      rank_b = b.getSortRank();
      if (rank_a < rank_b) {
        return 1;
      }
      if (rank_a > rank_b) {
        return -1;
      }
      if (a.get('title') === b.get('title')) {
        return 0;
      } else if (a.get('title') > b.get('title')) {
        return 1;
      } else {
        return -1;
      }
    }
  });
  IndexItemView = Backbone.Marionette.ItemView.extend({
    template: '#index-item-template',
    attributes: function() {
      return {
        'class': 'index-item ' + this.model.getItemClass()
      };
    },
    templateHelpers: {
      prettyDate: function(time) {
        return _.prettyDate(time);
      },
      getSummaryText: function(limit) {
        return _.truncate(this.summaryText, limit);
      }
    },
    events: {
      'click': 'clicked'
    },
    clicked: function(event) {
      if ($(event.target).hasClass('star')) {
        event.stopPropagation();
        return this.model.toggle('starred', !(this.$el.hasClass('starred')));
      } else if ($(event.target).hasClass('check')) {
        event.stopPropagation();
        if (this.$el.hasClass('read' || this.$el.hasClass('read'))) {
          this.model.toggle('read', false);
          return this.model.toggle('markasread', false);
        } else {
          return this.model.toggle('unread', false);
        }
      } else {
        event.preventDefault();
        App.router.navigate("#item/" + (this.model.get('id')), {
          trigger: true,
          replace: window.location.hash.indexOf('#item/') === 0
        });
        return $('.wrapper2').removeClass('on');
      }
    },
    modelEvents: {
      'change': 'changed'
    },
    changed: function() {
      var added, diff, newCategories, oldCategories, removed, _i, _j, _len, _len1, _ref, _ref1;

      newCategories = this.model.get('categories');
      oldCategories = this.model.previous('categories');
      diff = _.diff(oldCategories, newCategories);
      _ref = diff.added;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        added = _ref[_i];
        this.$el.addClass(added);
      }
      _ref1 = diff.removed;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        removed = _ref1[_j];
        this.$el.removeClass(removed);
      }
    }
  });
  IndexListView = Backbone.Marionette.CollectionView.extend({
    initialize: function() {
      var scroller,
        _this = this;

      this.loading = false;
      scroller = this.$el.parent();
      this.collection.on('article:current-change', function(id) {
        var cy, item, itemHeight, itemId, itemTop, outerHeight, scrollTop, sy, totalHeight;

        if (!id) {
          return;
        }
        itemId = id;
        item = _this.$el.find('.index-item article[data-id=' + itemId + ']');
        if (!item) {
          return;
        }
        item = item.parent();
        if (!item) {
          return;
        }
        scroller = _this.$el.parent();
        if (!scroller) {
          return;
        }
        scrollTop = scroller.scrollTop();
        outerHeight = scroller.outerHeight();
        if (!(outerHeight > 0)) {
          return;
        }
        if (!item.offset()) {
          return;
        }
        _this.$el.find('.index-item.current').removeClass('current');
        item.addClass('current');
        itemTop = scrollTop + item.offset().top;
        itemHeight = item.height();
        if (itemTop >= scrollTop + scroller.offset().top && itemTop + itemHeight <= scrollTop + scroller.offset().top + outerHeight) {
          return;
        }
        totalHeight = scroller.get(0).scrollHeight;
        cy = itemTop + (itemHeight / 2);
        sy = parseInt(cy - outerHeight / 3 - scroller.offset().top);
        sy = Math.max(0, Math.min(sy, totalHeight - outerHeight));
        return scroller.animate({
          scrollTop: sy
        });
      });
      scroller.bindWithDelay("scroll", function(event) {
        var outerHeight, scrollTop, totalHeight;

        if (_this.collection.isLoading()) {
          return;
        }
        outerHeight = scroller.outerHeight();
        totalHeight = scroller.get(0).scrollHeight;
        scrollTop = scroller.scrollTop();
        if (totalHeight(-(scrollTop + outerHeight) < outerHeight)) {
          return _this.collection.getMore(function() {});
        }
      }, 100);
      scroller && scroller.bindWithDelay("scroll", function(event) {
        console.log('scroll delay');
      }, 1000);
    },
    setStreamFilter: function(name) {
      var klass;

      $('.filter').removeClass('active');
      klass = name.split('/')[1];
      if (klass === 'reading-list') {
        klass = 'all';
      }
      $('.filter.' + klass).addClass('active');
    },
    scrollTop: function(n) {
      var scroller;

      scroller = this.$el.parent();
      return scroller.scrollTop(n);
    }
  });
  FeedView = Backbone.Marionette.ItemView.extend({
    template: '#feed-item-template',
    tagName: 'li',
    attributes: function() {
      return {
        'class': 'feed-item',
        'data-id': "stream/" + (encodeURIComponent(this.model.id))
      };
    },
    ui: {
      'counter': 'span.title>span.counter',
      'title': 'span.title>span.txt',
      'more': 'i.more',
      'mute': 'i.mute'
    },
    templateHelpers: {
      getCount: function(name) {
        var count;

        count = this[name];
        if (!count) {
          count = 0;
        }
        if (count > 1000) {
          return '1000+';
        } else {
          return "" + count;
        }
      },
      getStreamId: function() {
        return "stream/" + (encodeURIComponent(this.id));
      },
      getMuteClass: function() {
        if (this.mute) {
          return 'on';
        } else {
          return '';
        }
      }
    },
    events: {
      'click': 'clicked'
    },
    clicked: function(event) {
      var feedPanel, url;

      if ($(event.target).hasClass('more')) {
        event.stopPropagation();
        feedPanel = $('#feed-context-panel');
        if (feedPanel.hasClass('on')) {
          return App.vent.trigger('feed-panel:close');
        } else {
          return App.vent.trigger('feed-panel:open', this.model);
        }
      } else if ($(event.target).hasClass('mute')) {
        event.stopPropagation();
        return App.storage.subscriptionEdit(this.model.id, $(event.target).hasClass('on') ? 'unmute' : 'mute');
      } else {
        event.stopPropagation();
        url = '#' + this.templateHelpers.getStreamId.apply(this.model.attributes);
        if (window.location.hash === url) {
          App.vent.trigger('stream:reset', url.substring('#'.length));
        } else {
          App.router.navigate(url, {
            trigger: true
          });
        }
        App.vent.trigger('article:focus');
      }
    },
    modelEvents: {
      'change': 'changed'
    },
    changed: function() {
      var count;

      count = this.templateHelpers.getCount.apply(this.model.attributes, ['unread']);
      this.ui.counter.html("(" + count + ")");
      this.ui.counter.toggleClass('on', count === '0');
      this.ui.title.html(this.model.get('title'));
      this.ui.mute.toggleClass('on', this.model.get('mute'));
    }
  });
  LabelView = Backbone.Marionette.CompositeView.extend({
    itemView: FeedView,
    itemViewContainer: 'ul.feed-items',
    template: '#label-item-template',
    tagName: 'div',
    className: 'label-item',
    ui: {
      'counter': 'span.title>span.counter',
      'arrow': 'i.arrow',
      'more': 'i.more'
    },
    templateHelpers: {
      getCount: function(name) {
        var count;

        count = this[name];
        if (!count) {
          count = 0;
        }
        if (count > 1000) {
          return '1000+';
        } else {
          return "" + count;
        }
      },
      getStreamId: function() {
        switch (this.id) {
          case '***ALL***':
            return 'stream/' + encodeURIComponent('state/reading-list');
          case '***MUTES***':
            return 'stream/' + encodeURIComponent('state/mute');
          case '***OTHERS***':
            return 'stream/' + encodeURIComponent('label/');
          default:
            return 'stream/' + encodeURIComponent("label/" + this.id);
        }
      }
    },
    initialize: function() {
      this.collection = this.model.get('feeds');
    },
    events: {
      'click': 'clicked'
    },
    clicked: function(event) {
      var labelPanel, url;

      if ($(event.target).hasClass('more')) {
        event.stopPropagation();
        labelPanel = $('#label-context-panel');
        if (labelPanel.hasClass('on')) {
          App.vent.trigger('label-panel:close');
        } else {
          App.vent.trigger('label-panel:open', this.model);
        }
      } else if ($(event.target).hasClass('arrow')) {
        event.stopPropagation();
        this.$el.toggleClass('expanded');
      } else {
        event.stopPropagation();
        url = '#' + this.templateHelpers.getStreamId.apply(this.model.attributes);
        if (window.location.hash === url) {
          App.vent.trigger('stream:reset', url.substring('#'.length));
        } else {
          App.router.navigate(url, {
            trigger: true
          });
        }
        App.vent.trigger('article:focus');
      }
    },
    modelEvents: {
      'change': 'changed'
    },
    changed: function() {
      var counter;

      counter = this.templateHelpers.getCount.apply(this.model.attributes, ['unread']);
      this.ui.counter.html("(" + counter);
      this.ui.counter.toggleClass('on', counter === '0');
    }
  });
  LabelsView = Backbone.Marionette.CollectionView.extend({
    itemView: LabelView,
    setCurrent: function(url) {
      App.labelsView.$el.find('li.current').removeClass('current');
      App.labelsView.$el.find('li[data-id="' + url + '"]').addClass('current');
    }
  });
  ArticleView = Backbone.Marionette.ItemView.extend({
    template: '#article-template',
    initialize: function() {},
    templateHelpers: {
      prettyDate: function(time) {
        return _.prettyDate(time);
      },
      getContent: function() {
        if (this.content && this.content.content) {
          return this.content.content;
        }
        if (this.summary && this.summary.content) {
          return this.summary.content;
        }
        return "";
      },
      getItemClass: function() {
        var klasses;

        klasses = [];
        if (_.contains(this.categories, 'state/read')) {
          klasses.push('read');
        }
        if (_.contains(this.categories, 'state/starred')) {
          klasses.push('starred');
        }
        if (_.contains(this.categories, 'state/markasread')) {
          klasses.push('markasread');
        }
        return klasses.join(' ');
      }
    },
    events: {
      'click div.article-origin': 'originClicked',
      'click a': 'linkClicked'
    },
    originClicked: function(event) {
      var origin;

      return origin = this.model.get('origin');
    },
    onRender: function() {
      this.$el.find('.article-item').toggleClass('read', this.model.isRead()).toggleClass('markasread', this.model.isMarkAsRead()).toggleClass('starred', this.model.isStarred()).find('img').removeAttr('width height');
    }
  });
  AppStorage = Backbone.Marionette.Controller.extend({
    cached_items: new ArticleList([], {
      model: Article,
      url: '',
      page_size: 20,
      continuation: ''
    }),
    initialize: function() {
      var _this = this;

      this.loadSubscriptions();
      if (!this.feeds.length) {
        this.loadSubscriptionsRemote(function() {
          _this.buildLabels();
          _this.saveSubscriptions();
        });
      } else {
        this.buildLabels();
      }
      this.loadItems();
    },
    buildLabels: function() {
      var _this = this;

      this.labels = new LabelList();
      this.allLabel = new Label({
        'id': App.all_label_id,
        'title': 'All',
        'feeds': new FeedList()
      });
      this.othersLabel = new Label({
        'id': App.other_label_id,
        'title': 'Others',
        'feeds': new FeedList()
      });
      this.mutesLabel = new Label({
        'id': App.mutes_label_id,
        'title': 'Mutes',
        'feeds': new FeedList()
      });
      this.labels.add(this.allLabel);
      this.labels.add(this.othersLabel);
      this.labels.add(this.mutesLabel);
      this.feeds.each(function(feed) {
        _this.allLabel.addFeed(feed);
        if (feed.mute) {
          _this.mutesLabel.addFeed(feed);
        }
        if (feed.get('categories') && feed.get('categories').length) {
          _.each(feed.get('categories'), function(category) {
            var label;

            label = this.labels.get(category);
            if (!label) {
              label = new Label({
                id: category,
                title: category,
                feeds: new FeedList()
              });
              this.labels.add(label);
            }
            return label.addFeed(feed);
          }, _this);
        }
      });
      this.labels.forEach(function(label) {
        label.get('feeds').sort();
      });
      this.labels.sort();
      return this;
    },
    feeds: new FeedList(),
    labels: new LabelList(),
    getFeedByStreamId: function(streamId) {
      return this.feeds.get(streamId);
    },
    getFeeds: function() {
      return this.feeds;
    },
    getLabel: function(label_name) {
      return this.labels.get(label_name);
    },
    getLabels: function() {
      return this.labels;
    },
    valid_filters: ['state/reading-list', 'state/unread', 'state/starred'],
    setStreamFilter: function(name) {
      var filter;

      filter = _.contains(this.valid_filters, name) ? name : _.first(this.valid_filters);
      return localStorage.setItem('storage-stream-filter', filter);
    },
    getStreamFilter: function() {
      return localStorage.getItem('storage-stream-filter') || _.first(this.valid_filters);
    },
    setStreamId: function(streamId) {
      return localStorage.setItem('storage-stream-id', streamId);
    },
    getStreamId: function() {
      return localStorage.getItem('storage-stream-id') || _.first(this.valid_filters);
    },
    getCachedItems: function(collection) {
      var cached_items, filter, streamId, t;

      if (!collection) {
        return [];
      }
      streamId = collection.stream;
      if (!streamId) {
        throw "streamId can not be null";
      }
      filter = this.getStreamFilter();
      cached_items = [];
      t = parseInt($.now() / 1000);
      if (collection.length) {
        t = collection.last().get('updated');
      }
      this.cached_items.each(function(cached_item) {
        var categories;

        if (cached_item.get('updated') > t) {
          return;
        }
        categories = cached_item.get('categories');
        if (streamId.indexOf('label/') === 0 && !_.contains(categories, streamId)) {
          return;
        }
        if (streamId.indexOf('feed/') === 0 && cached_item.get('origin') !== streamId) {
          return;
        }
        if (streamId.indexOf('state/') === 0) {
          if (streamId === 'state/unread' && (cached_item.isRead() || cached_item.isMarkAsRead())) {
            return;
          }
          if (streamId === 'state/starred' && !cached_item.isStarred()) {
            return;
          }
        }
        if (filter === 'state/unread' && (cached_item.isRead() || cached_item.isMarkAsRead())) {
          return;
        }
        if (filter === 'state/starred' && !cached_item.isStarred()) {
          return;
        }
        cached_items.push(_.pick(cached_item, 'id', 'updated'));
      }, this);
      cached_items.sort(function(a, b) {
        return b.updated - a.updated;
      });
      return _.head(cached_items, collection.page_size * 2);
    },
    getItemsRemote: function(collection, callback) {
      var filter, p, qs, qsa, url, _i, _len,
        _this = this;

      qsa = [];
      url = ("" + API_URL + "/stream/contents/") + collection.stream;
      qsa.push(['n', collection.page_size]);
      qsa.push(['ck', $.now()]);
      if (collection.continuation) {
        qsa.push(['c', collection.continuation]);
      }
      filter = this.getStreamFilter();
      if (filter && filter !== _.first(this.valid_filters)) {
        qsa.push(['filter', filter]);
      }
      qs = [];
      for (_i = 0, _len = qsa.length; _i < _len; _i++) {
        p = qsa[_i];
        qs.push("" + p[0] + "=" + p[1]);
      }
      url += '?' + qs.join('&');
      return $.ajax({
        url: url,
        type: 'POST',
        beforeSend: function(xhr) {
          xhr.overrideMimeType("application/json; charset=UTF-8");
        },
        data: JSON.stringify({
          version: '1.0',
          items: this.getCachedItems(collection)
        })
      }).done(function(data) {
        var article, attributes, categories, diff, i, itemIsChanged, itemsAreChanged, old_catetories;

        itemsAreChanged = false;
        for (i in data) {
          attributes = data[i];
          if (!attributes.cached) {
            article = new Article(attributes);
            _this.cached_items.add(article);
            if (collection) {
              collection.add(article);
            }
            itemsAreChanged = true;
          } else {
            article = _this.cached_items.get(attributes.id);
            itemIsChanged = false;
            if (attributes.categories) {
              old_catetories = article.get('categories');
              categories = attributes.categories;
              diff = _.diff(old_catetories, categories);
              if (diff.added.length || diff.removed.length) {
                itemIsChanged = true;
              }
              if (itemIsChanged) {
                article.set({
                  categories: categories
                });
              }
            }
          }
        }
        if (collection) {
          collection.continuation = data.continuation;
        }
        if (itemsAreChanged) {
          _this.saveItems();
        }
        callback && callback();
      });
    },
    loadSubscriptionsRemote: function(callback) {
      var _this = this;

      $.ajax({
        url: "var/data/subscriptions.json?ck=" + ($.now()),
        type: 'POST',
        beforeSend: function(xhr) {
          xhr.overrideMimeType("application/json; charset=UTF-8");
        }
      }).done(function(data) {
        data = _.map(data, function(row, i) {
          var field, label, old_field, _ref;

          _ref = App.stat_fields;
          for (field in _ref) {
            label = _ref[field];
            old_field = "" + field + "_count";
            if (_.has(row, old_field)) {
              row[field] = row[old_field];
              delete row[old_field];
            }
          }
          return row;
        });
        _this.feeds.reset(data);
        callback && callback();
      });
    },
    loadSubscriptions: function() {
      return this.feeds.reset(JSON.parse(localStorage.getItem('subscriptions')));
    },
    loadItems: function() {
      return this.cached_items.reset(JSON.parse(localStorage.getItem('item')));
    },
    saveSubscriptions: function() {
      localStorage.removeItem('subscriptions');
      localStorage.setItem('subscriptions', JSON.stringify(this.feeds.toJSON()));
    },
    getItem: function(id) {
      return this.cached_items.get(id);
    },
    saveItems: function() {
      var items, max_cache_items;

      localStorage.removeItem('item');
      items = this.cached_items.toJSON();
      max_cache_items = 100;
      if (items.length > max_cache_items) {
        items.sort(function(a, b) {
          return b.updated - a.updated;
        });
        items.length = max_cache_items;
      }
      return localStorage.setItem('item', JSON.stringify(items));
    },
    quickSubscribe: function(query, callback) {
      return $.ajax({
        url: "" + API_URL + "/subscription/quickadd?ck=" + ($.now()),
        type: 'POST',
        data: {
          "quickadd": query
        }
      }).done(function(data) {
        return callback && callback(data);
      });
    }
  });
  AppRouter = Backbone.Router.extend({
    initialize: function() {
      this.routesHit = 0;
      Backbone.history.on('route', function() {
        this.routesHit++;
      }, this);
      this.mark_timer = null;
    },
    next: function() {},
    routes: {
      'item/:id': "itemView",
      'stream/*query': "streamView"
    },
    itemView: function(id) {
      App.vent.trigger('article:change', id);
    },
    streamView: function(stream) {
      if (App.indexList.stream === stream) {
        App.indexList.trigger('article:current-change', App.indexList.currentId);
        return;
      }
      App.vent.trigger('stream:reset', stream);
    },
    back: function() {
      if (this.routesHit) {
        window.history.back();
      } else {
        this.navigate(buildUrlHash('stream', 'state/reading-list'), {
          trigger: true,
          replace: true
        });
      }
    }
  });
  buildUrlHash = function(prefix, path) {
    return "#" + prefix + "/" + (encodeURIComponent(path));
  };
  window.App = App = new Backbone.Marionette.Application();
  _.extend(App, {
    all_label_id: '***ALL***',
    other_label_id: '***OTHERS***',
    mutes_label_id: '***MUTES***',
    _: function(msg_id) {
      return msg_id;
    }
  });
  App.stat_fields = {
    unread: App._('unread'),
    all: App._('all'),
    starred: App._('starred'),
    markasread: App._('markasread'),
    read: App._('read')
  };
  App.hot_keys = {
    'k': {
      'desc': '向上滚动',
      'alias': 'left',
      'handler': function() {
        App.vent.trigger('article:prev', App.articleView.model.id);
        return false;
      }
    },
    'j': {
      'desc': '向下滚动',
      'alias': 'right',
      'handler': function() {
        App.vent.trigger('article:next', App.articleView.model.id);
        return false;
      }
    },
    'f1': {
      name: 'F1/?',
      alias: 'shit+/',
      'desc': '获取本帮助',
      'handler': function() {
        App.vent.trigger('help:shortcuts');
        return false;
      }
    },
    's': {
      'desc': '标记喜欢/不喜欢',
      'handler': function() {
        App.articleView.model.toggle('star');
        return false;
      }
    },
    'a': {
      'desc': '标记已读/未读',
      'handler': function() {
        App.articleView.model.toggle('markasread');
        return false;
      }
    },
    '/': {
      'desc': '搜索',
      'handler': function() {
        return false;
      }
    }
  };
  App.addInitializer(function(options) {
    var streamFilter, streamId;

    App.router = new AppRouter();
    App.storage = new AppStorage();
    streamId = App.storage.getStreamId();
    streamFilter = App.storage.getStreamFilter();
    App.labelsView = new LabelsView({
      el: '#label-view',
      collection: App.storage.getLabels()
    });
    App.labelsView.render();
    App.indexList = new ArticleList([], {
      stream: streamId,
      page_size: 20,
      continuation: ''
    });
    App.indexView = new IndexListView({
      el: "#index-view",
      itemView: IndexItemView,
      collection: App.indexList
    });
    App.indexView.render();
    App.storage.setStreamFilter(streamFilter);
    App.indexView.setStreamFilter(streamFilter);
    App.vent.on('stream:reset', function(stream) {
      if (stream) {
        App.indexList.stream = stream;
      }
      App.indexList.continuation = null;
      App.indexList.reset();
      App.indexView.scrollTop(0);
      App.indexList.loadMore(function() {
        if (App.indexList.length > 0) {
          App.vent.trigger('article:change', App.indexList.at(0).id);
        }
      });
      App.labelsView.setCurrent('stream/' + App.indexList.url);
    });
    App.vent.trigger('stream:reset');
    App.vent.on('article:change', function(id) {
      var newArticle,
        _this = this;

      if (this.read_countdown_timer) {
        clearTimeout(this.read_countdown_timer);
        this.read_countdown_timer = null;
        if (App.articleView.model) {
          App.articleView.model.toggle('markasread', true);
        }
      }
      newArticle = App.storage.getItem(id);
      App.articleView = new ArticleView({
        el: '#article-view',
        model: newArticle
      });
      App.articleView.render();
      App.indexList.trigger('article:current-change', id);
      document.title = newArticle.get('title');
      this.read_countdown_timer = setTimeout(function() {
        _this.read_countdown_timer = null;
        App.articleView.model.toggle('read', true);
      }, 3000);
    });
    App.vent.on('article:prev', function(id) {
      var article, url;

      if (!id) {
        id = App.articleView.model.id;
      }
      if (!App.indexList) {
        return;
      }
      article = App.indexList.getPrev(id);
      if (article) {
        url = "#item/" + (article.get('id'));
        App.router.navigate(url, {
          trigger: true,
          replace: true
        });
      } else {
        console.log("this is the first article");
      }
    });
    App.vent.on('article:next', function(id) {
      var article, url;

      if (!App.indexList) {
        return;
      }
      if (!id) {
        id = App.articleView.model.id;
      }
      article = App.indexList.getNext(id);
      if (article) {
        url = "#item/" + (article.get('id'));
        App.router.navigate(url, {
          trigger: true,
          replace: true
        });
      } else {
        console.log("this is the last article");
      }
    });
    App.vent.on('filter', function(state) {
      var stream;

      if (state === 'all') {
        stream = 'state/reading-list';
      } else {
        stream = "state/" + state;
      }
      App.indexView.setStreamFilter(stream);
      App.storage.setStreamFilter(stream);
      App.vent.trigger('stream:reset');
    });
    Backbone.history.start();
  });
  App.vent.on('help:shortcuts', function() {});
  App.addInitializer(function(options) {
    var alias_key, evt, key, key_config, _i, _len, _ref, _ref1;

    evt = 'keypress';
    _ref = App.hot_keys;
    for (key in _ref) {
      key_config = _ref[key];
      $(document).bind(evt, key, key_config.handler);
      if (key_config.alias) {
        _ref1 = key_config.alias.split(' ');
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          alias_key = _ref1[_i];
          $(document).bind(evt, alias_key, key_config.handler);
        }
      }
    }
  });
  App.addInitializer(function(options) {
    $('.app-toolbar .article_list.panel').delegate('button.btn', 'click', function() {
      var $btn, state, _i, _len, _ref;

      $btn = $(this);
      if ($btn.hasClass('mark')) {
        $.ajax({
          url: "" + API_URL + "/mark-all-as-read?ck=" + ($.now()),
          type: 'POST',
          data: {
            "s": App.indexList.stream,
            "t": App.indexList.title
          }
        }).done(function(data) {
          console.log(data);
        });
      } else if ($btn.hasClass('filter')) {
        _ref = ['all', 'unread', 'starred'];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          state = _ref[_i];
          if ($btn.hasClass(state)) {
            App.vent.trigger('filter', state);
            break;
          }
        }
      }
    });
    $('.app-toolbar .article_detail.panel').delegate('button.btn', 'click', function() {
      var $btn, state, _i, _j, _len, _len1, _ref, _ref1;

      $btn = $(this);
      if ($btn.hasClass('toggle')) {
        _ref = ['markasread', 'starred'];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          state = _ref[_i];
          if ($btn.hasClass(state)) {
            App.articleView.model.toggle(state);
            break;
          }
        }
      } else if ($btn.hasClass('goto')) {
        _ref1 = ['refresh', 'next', 'prev'];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          state = _ref1[_j];
          if ($btn.hasClass(state)) {
            App.vent.trigger("article:" + state);
            break;
          }
        }
      }
    });
  });
  App.start();
});
