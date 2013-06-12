/**
 *
 */

/*
bindWithDelay jQuery plugin
Author: Brian Grinstead
MIT license: http://www.opensource.org/licenses/mit-license.php

http://github.com/bgrins/bindWithDelay
http://briangrinstead.com/files/bindWithDelay

Usage:
    See http://api.jquery.com/bind/
    .bindWithDelay( eventType, [ eventData ], handler(eventObject), timeout, throttle )

Examples:
    $("#foo").bindWithDelay("click", function(e) { }, 100);
    $(window).bindWithDelay("resize", { optional: "eventData" }, callback, 1000);
    $(window).bindWithDelay("resize", callback, 1000, true);
*/

(function($) {

$.fn.bindWithDelay = function( type, data, fn, timeout, throttle ) {

    if ( $.isFunction( data ) ) {
        throttle = timeout;
        timeout = fn;
        fn = data;
        data = undefined;
    }

    // Allow delayed function to be removed with fn in unbind function
    fn.guid = fn.guid || ($.guid && $.guid++);

    // Bind each separately so that each element has its own delay
    return this.each(function() {

        var wait = null;

        function cb() {
            var e = $.extend(true, { }, arguments[0]);
            var ctx = this;
            var throttler = function() {
                wait = null;
                fn.apply(ctx, [e]);
            };

            if (!throttle) { clearTimeout(wait); wait = null; }
            if (!wait) { wait = setTimeout(throttler, timeout); }
        }

        cb.guid = fn.guid;

        $(this).bind(type, data, cb);
    });
};

})(jQuery);

$(function() {
	// 避免与 JSP 冲突
	_.templateSettings = {
		    interpolate: /\<\@\=(.+?)\@\>/gim,
		    evaluate: /\<\@(.+?)\@\>/gim,
		    escape: /\<\@\-(.+?)\@\>/gim
		};

	var isDebugOn = (window.location.protocol == 'file:');

	var Feed = Backbone.Model.extend ({
		defaults: {
			'unread_count': 0,
			'all_count': 0,
			'starred_count': 0,
			'markasread_count': 0,
			'read_count': 0
		},

		initialize : function() {
			this.on ('change', function () {
				var model = this;
				var labels = App.storage.getLabels ();

				var all_delta = (model.get('all_count') - model.previous('all_count'));
				var unread_delta = (model.get('unread_count') - model.previous('unread_count'));
				var starred_delta = (model.get('starred_count') - model.previous('starred_count'));
				var markasread_delta = (model.get('markasread_count') - model.previous('markasread_count'));
				var read_delta = (model.get('read_count') - model.previous('read_count'));

				var allLabel = labels.get ('***ALL***');
				allLabel.set('all_count', allLabel.get('all_count') + all_delta);
				allLabel.set('unread_count', allLabel.get('unread_count') + unread_delta);
				allLabel.set('starred_count', allLabel.get('starred_count') + starred_delta);
				allLabel.set('markasread_count', allLabel.get('markasread_count') + markasread_delta);
				allLabel.set('read_count', allLabel.get('read_count') + read_delta);

				if (model.mute) {
					var mutesLabel = labels.get ('***MUTES***');
					mutesLabel.set('all_count', mutesLabel.get('all_count') + all_delta);
					mutesLabel.set('unread_count', mutesLabel.get('unread_count') + unread_delta);
					mutesLabel.set('starred_count', mutesLabel.get('starred_count') + starred_delta);
					mutesLabel.set('markasread_count', mutesLabel.get('markasread_count') + markasread_delta);
					mutesLabel.set('read_count', mutesLabel.get('read_count') + read_delta);
				}

				// others
				if (!model.get("categories") || model.get("categories").length == 0) {
					var othersLabel = labels.get ('***OTHERS***');
					othersLabel.set('all_count', othersLabel.get('all_count') + all_delta);
					othersLabel.set('unread_count', othersLabel.get('unread_count') + unread_delta);
					othersLabel.set('starred_count', othersLabel.get('starred_count') + starred_delta);
					othersLabel.set('markasread_count', othersLabel.get('markasread_count') + markasread_delta);
					othersLabel.set('read_count', othersLabel.get('read_count') + read_delta);
				} else {
					_.each (model.get("categories"), function (category) {
						// 如果是新的分类，创建分类
						var label = labels.get (category);
						if (!label)
							return;

						label.set('all_count', label.get('all_count') + all_delta);
						label.set('unread_count', label.get('unread_count') + unread_delta);
						label.set('starred_count', label.get('starred_count') + starred_delta);
						label.set('markasread_count', label.get('markasread_count') + markasread_delta);
						label.set('read_count', label.get('read_count') + read_delta);
					});
				}
			});
		},

		markAsRead: function () {
			// 发送请求
			// 如果请求发送成功，unread_count 计数器清零
			//App.storage.mark (this, 'read');
			App.storage.mark (this, 'markasread');
		}

	});

	var FeedList = Backbone.Collection.extend({
		model : Feed,

		initialize : function() {
		},

		comparator: function (a, b) {
			// mute 的项目在后边
			if (a.get('mute') && !b.get('mute')) return 1;
			if (!a.get('mute') && b.get('mute')) return -1;

			// 有未读的在前
			if (a.get("unread_count") == 0 && b.get("unread_count") > 0) return 1;
			if (b.get("unread_count") == 0 && a.get("unread_count") > 0) return -1;

			// XXX 配置参数
			var k1 = -1; // markasread
			var k2 = 2; // read
			var k3 = 5; // starred

			var rank_a = a.get("markasread_count")*k1 + a.get("read_count")*k2 + a.get("starred_count")*k3;
			var rank_b = b.get("markasread_count")*k1 + b.get("read_count")*k2 + b.get("starred_count")*k3;
			if (rank_a > rank_b)
				return -1;
			if (rank_a < rank_b)
				return 1;

			return (a.get("title") == b.get("title")) ? 0 : ((a.get("title") > b.get("title")) ? 1 : -1);
		}
	});

	var Label = Backbone.Model.extend ({
		defaults: {
			'unread_count': 0,
			'all_count': 0,
			'starred_count': 0,
			'markasread_count': 0,
			'read_count': 0
		},

		markAsRead: function () {
			//App.storage.mark (this, 'read');
			App.storage.mark (this, 'markasread');
		}

	});

	var LabelList = Backbone.Collection.extend({
		model : Label,

		initialize : function() {
		},

		comparator: function (a, b) {
			// ALL 在最上方
			if (a.get("id") == '***ALL***')
				return -1;
			if (b.get("id") == '***ALL***')
				return 1;

			// MUTES 在最下方
			if (a.get("id") == '***MUTES***')
				return 1;
			if (b.get("id") == '***MUTES***')
				return -1;

			// 有未读的在前
			if (a.get("unread_count") == 0 && b.get("unread_count") > 0) return 1;
			if (b.get("unread_count") == 0 && a.get("unread_count") > 0) return -1;

			// XXX 配置参数
			var k1 = -1; // markasread
			var k2 = 2; // read
			var k3 = 5; // starred

			// 标星，全部，已读
			var rank_a = a.get("markasread_count")*k1 + a.get("read_count")*k2 + a.get("starred_count")*k3;
			var rank_b = b.get("markasread_count")*k1 + b.get("read_count")*k2 + b.get("starred_count")*k3;
			if (rank_a > rank_b)
				return -1;
			if (rank_a < rank_b)
				return 1;

			return (a.get("title") == b.get("title")) ? 0 : ((a.get("title") > b.get("title")) ? 1 : -1);
		}
	});

	var FeedView = Backbone.Marionette.ItemView.extend({
		template : '#feed-item-template',

		tagName: 'li',

		attributes : function () {
			return {
				'class' : 'feed-item',
				'data-id': 'stream/' + encodeURIComponent (this.model.id)
			}
		},

		ui: {
			'counter': 'span.title>span.counter',
			'title': 'span.title>span.txt',
			'more': 'i.more',
			'mute': 'i.mute'
		},

		templateHelpers: {
			getCount: function (name) { // unread, all, starred
				name = name || 'unread';
				var count = this[name + '_count'];
				if (!count)
					count = 0;
				if (count > 1000)
					return '1000+';
				else
					return '' + count;
			},

			getStreamId: function () {
				return 'stream/' + encodeURIComponent (this.id);
			},

			getMuteClass: function () {
				if (this.mute)
					return 'on';
				return '';
			}
		},

		events: {
			'click': 'clicked'
		},

		clicked: function (event) {
			if ($(event.target).hasClass ('more')) { // 打开
				event.stopPropagation ();

				var feedPanel = $('#feed-context-panel');
				if (feedPanel.hasClass ('on')) {
					// 关闭 feed-panel
					App.vent.trigger ('feed-panel:close');
				} else {
					// 打开 feed-panel
					App.vent.trigger ('feed-panel:open', this.model);
				}
			} else if ($(event.target).hasClass ('mute')) { // 静音切换
				event.stopPropagation ();

				App.storage.subscriptionEdit (this.model.id, $(event.target).hasClass ('on') ? 'unmute' : 'mute')
			} else { // 标题点击，切换内容
				event.stopPropagation ();

				var url = '#' + this.templateHelpers.getStreamId.apply (this.model.attributes);
				if (window.location.hash == url) {
					App.vent.trigger ('stream:reset', url.substring ('#'.length));
				} else {
					App.router.navigate (url, {trigger: true});
				}

				App.vent.trigger ('article:focus');
			}
		},

		modelEvents: {
			'change': 'changed'
		},

		changed: function () {
			this.ui.counter.html ('(' + this.templateHelpers.getCount.apply (this.model.attributes, ['unread']) + ')');
			if (this.templateHelpers.getCount.apply (this.model.attributes, ['unread']) == '0')
				this.ui.counter.removeClass ('on');
			else
				this.ui.counter.addClass ('on');

			this.ui.title.html (this.model.get ('title'));

			if (this.model.get ('mute'))
				this.ui.mute.addClass ('on');
			else
				this.ui.mute.removeClass ('on');
		}
	});

	var LabelView = Backbone.Marionette.CompositeView.extend({
		itemView: FeedView,
		itemViewContainer: 'ul.feed-items',

		template : '#label-item-template',

		tagName: 'div',
		className: 'label-item',

		ui: {
			'counter': 'span.title>span.counter',
			'arrow': 'i.arrow',
			'more': 'i.more'
		},

		templateHelpers: {
			getCount: function (name) { // unread, all, starred
				name = name || 'unread';
				var count = this[name + '_count'];
				if (!count)
					count = 0;
				if (count > 1000)
					return '1000+';
				else
					return '' + count;
			},

			getStreamId: function () {
				switch (this.id) {
				case '***ALL***':
					return 'stream/' + encodeURIComponent ('state/reading-list');
				case '***MUTES***':
					return 'stream/' + encodeURIComponent ('state/mute');
				case '***OTHERS***':
					return 'stream/' + encodeURIComponent ('label/');
				default:
					return 'stream/' + encodeURIComponent ('label/' + this.id);
				}
			}
		},

		initialize : function () {
			this.collection = this.model.get ('feeds');
		},

		events: {
			'click': 'clicked'
		},

		clicked: function (event) {
			if ($(event.target).hasClass ('more')) { // label-panel
				event.stopPropagation ();

				var labelPanel = $('#label-context-panel');
				if (labelPanel.hasClass ('on')) {
					App.vent.trigger ('label-panel:close');
				} else {
					App.vent.trigger ('label-panel:open', this.model);
				}
			} else if ($(event.target).hasClass ('arrow')) { // 展开/关闭
				event.stopPropagation ();

				if (this.$el.hasClass ('expanded')) {
					this.$el.removeClass ('expanded');
				} else {
					this.$el.addClass ('expanded');
				}
			} else { // 标题点击，切换
				event.stopPropagation ();

				var url = '#' + this.templateHelpers.getStreamId.apply (this.model.attributes);
				if (window.location.hash == url) {
					App.vent.trigger ('stream:reset', url.substring ('#'.length));
				} else {
					App.router.navigate (url, {trigger: true});
				}

				App.vent.trigger ('article:focus');
			}
		},

		modelEvents: {
			'change': 'changed'
		},

		changed: function () {
			this.ui.counter.html ('(' + this.templateHelpers.getCount.apply (this.model.attributes, ['unread']) + ')');
			if (this.templateHelpers.getCount.apply (this.model.attributes, ['unread']) == '0')
				this.ui.counter.removeClass ('on');
			else
				this.ui.counter.addClass ('on');
		}
	});

	var LabelsView = Backbone.Marionette.CollectionView.extend ({
		itemView: LabelView,

		setCurrent: function (url) {
			// 设置焦点
			App.labelsView.$el.find ('li.current').removeClass ('current');
			App.labelsView.$el.find ('li[data-id="' + url + '"]').addClass ('current');
		}

	});

	var Article = Backbone.Model.extend({
		mark: function (name) { // read, unread, star, unstar
			App.storage.mark (this, name);
		},

		getItemClass: function () {
			var className = '';

			var categories = this.get ('categories');
			if (categories && categories.length > 0) {
				if (categories.indexOf ('state/read') >= 0)
					className += ' read';
				if (categories.indexOf ('state/markasread') >= 0)
					className += ' markasread';
				if (categories.indexOf ('state/starred') >= 0)
					className += ' starred';
			}

			return className;
		},

		isRead: function () {
			var categories = this.get ('categories');
			if (categories && categories.length > 0)
				return (categories.indexOf ('state/read') >= 0);

			return false;
		},

		isMarkAsRead: function () {
			var categories = this.get ('categories');
			if (categories && categories.length > 0)
				return (categories.indexOf ('state/markasread') >= 0);

			return false;
		},

		isStarred: function () {
			var categories = this.get ('categories');
			if (categories && categories.length > 0)
				return (categories.indexOf ('state/starred') >= 0);

			return false;
		}
	});

	var ArticleList = Backbone.Collection.extend({
		model : Article,

		initialize : function(items, options) {
			this.page_size = options.page_size;
			this.continuation = options.continuation;
			this.url = options.url;

			this.loading = false;

			this.on ('article:current-change', function (id) {
				this.currentId = id;
			});
		},

		getNext: function (id) {
			// 如果是最后一篇，自动加载更多
			var index = -1;
			for (var i = 0; i < this.length-1; i ++) {
				if (this.at (i).get ('id') == id) {
					index = i + 1;
				}
			}
			if (index < 0)
				return null;
			else if (index == this.length - 1) {
				this.getMore ();
			}
			return this.at (index);
		},

		getPrev: function (id) {
			for (var i = 1; i < this.length; i ++) {
				if (this.at (i).get ('id') == id) {
					return this.at (i-1);
				}
			}
			return null;
		},

		getMore: function (callback) {
			this.loading = true;

			var that = this;
			App.storage.getItems (this, function () {
				that.loading = false;

				callback && callback ();
			});
		},

		isLoading: function () {
			return this.loading;
		}
	});

	var IndexItemView = Backbone.Marionette.ItemView.extend({
		template : '#index-item-template',

		attributes : function () {
			return {
				'class' : 'index-item' + this.model.getItemClass ()
			}
		},

		templateHelpers: {
			prettyDate: function (time) {
				var date = new Date(time);
				var	diff = (((new Date()).getTime() - date.getTime()) / 1000),
					day_diff = Math.floor(diff / 86400);

				if ( isNaN(day_diff) || day_diff < 0 )
					return;

				return day_diff == 0 && (
						diff < 60 && "moments ago" ||
						diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
						diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
					day_diff == 1 && "Yesterday" ||
					day_diff < 7 && day_diff + " days ago" ||
					day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago" ||
					day_diff < 365 && Math.ceil( day_diff / 30.5 ) + " months ago" ||
					day_diff > 365 && Math.ceil( day_diff / 365 ) + " years ago"
			},

			getSummaryText: function (limit) {
				if (!limit || limit <= 0)
					limit = 280;

				var summaryText = this.summaryText;
				if (summaryText.length > limit/2) {
					var m = 0;
					var n = 0;
					for (m = 0; m < summaryText.length && n < limit; m ++) {
						var c = summaryText.charCodeAt(m);

						n ++;
						// 双字节按2个长度计算
						if (c > 256 || c < 0)
							n ++;
					}
					if (m < summaryText.length)
						summaryText = summaryText.substring(0, m) + "...";
				}
				return summaryText;
			}
		},

		events: {
			'click': 'clicked'
		},

		clicked: function (event) {
			if ($(event.target).hasClass ('star')) {
				event.stopPropagation ();

				if (this.$el.hasClass ('starred')) {
					this.model.mark ('unstar');
				} else {
					this.model.mark ('star');
				}
			} else if ($(event.target).hasClass ('check')) {
				event.stopPropagation ();

				if (this.$el.hasClass ('read') || this.$el.hasClass ('markasread')) {
					this.model.mark ('unread');
				} else {
					this.model.mark ('markasread');
				}
			} else {
				event.preventDefault ();

				App.router.navigate ('#item/' + this.model.get ('id'), {trigger: true, replace: (window.location.hash.indexOf ('#item/') == 0)});

				$('.wrapper2').removeClass ('on');
			}
		},

		modelEvents: {
			'change': 'changed'
		},

		changed: function () {
			var newCategories = this.model.get ('categories');
			var oldCategories = this.model.previous ('categories');
			if (newCategories.indexOf ('state/starred') >= 0 && oldCategories.indexOf ('state/starred') < 0)
				this.$el.addClass ('starred');
			if (newCategories.indexOf ('state/starred') < 0 && oldCategories.indexOf ('state/starred') >= 0)
				this.$el.removeClass ('starred');
			if (newCategories.indexOf ('state/read') >= 0 && oldCategories.indexOf ('state/read') < 0)
				this.$el.addClass ('read');
			if (newCategories.indexOf ('state/read') < 0 && oldCategories.indexOf ('state/read') >= 0)
				this.$el.removeClass ('read');
			if (newCategories.indexOf ('state/markasread') >= 0 && oldCategories.indexOf ('state/markasread') < 0)
				this.$el.addClass ('markasread');
			if (newCategories.indexOf ('state/markasread') < 0 && oldCategories.indexOf ('state/markasread') >= 0)
				this.$el.removeClass ('markasread');
		}

	});

	var IndexListView = Backbone.Marionette.CollectionView.extend({
		initialize : function () {
			this.loading = false;

			var that = this;
			this.collection.on ('article:current-change', function (id) {
				if (!id)
					return;

				var itemId = id;

				var item = that.$el.find('.index-item article[data-id=' + itemId + ']');
				if (!item) return;
				item = item.parent ();
				if (!item) return;

				var scroller = $(that.options.scroller);
				if (!scroller)
					return;

				var scrollTop = scroller.scrollTop ();
				var outerHeight = scroller.outerHeight ();
				if (outerHeight <= 0)
					return;

				if (!item.offset ())
					return;

				that.$el.find('.index-item.current').removeClass ('current');
				item.addClass ('current');

				var itemTop = scrollTop + item.offset ().top;
				var itemHeight = item.height ();
				if (itemTop >= scrollTop+scroller.offset ().top && itemTop + itemHeight <= scrollTop+scroller.offset ().top + outerHeight)
					return;

				var totalHeight = scroller.get(0).scrollHeight;
				var cy = itemTop + (itemHeight/2);
				var sy = parseInt (cy - outerHeight/3 - scroller.offset ().top);

				sy = Math.max (0, Math.min(sy, totalHeight-outerHeight));

				scroller.animate({scrollTop: sy});
			});

			//
			if (this.options && this.options.scroller) {
				var scroller = $(this.options.scroller);

				scroller && scroller.bindWithDelay ("scroll", function(event) {
					if (that.collection.isLoading ())
						return;

					var outerHeight = scroller.outerHeight ();
					var totalHeight = scroller.get(0).scrollHeight;
					var scrollTop = scroller.scrollTop ();

					if (totalHeight - (scrollTop + outerHeight) < outerHeight) {
						// 显示一个等待信息
						that.collection.getMore (function () {
							// 关闭等待信息
						});
					}
				}, 100);

				// 加入延迟绑定事件，用于处理自动标记为已读
				// 当前位置之上的都标记为已读
				scroller && scroller.bindWithDelay ("scroll", function(event) {
					console.log ('scroll delay');
				}, 1000);
			}
		},

		setStreamFilter: function (name) {
			$('#filter-all').removeClass ('active');
			$('#filter-unread').removeClass ('active');
			$('#filter-starred').removeClass ('active');

			switch (name) {
			case 'state/reading-list':
				$('#filter-all').addClass ('active');
				break;
			case 'state/unread':
				$('#filter-unread').addClass ('active');
				break;
			case 'state/starred':
				$('#filter-starred').addClass ('active');
				break;
			default:
				$('#filter-all').addClass ('active');
				break;
			}
		},

		scrollTop: function (n) {
			var scroller = $(this.options.scroller);
			scroller.scrollTop (n);
		}

	});

	var ArticleView = Backbone.Marionette.ItemView.extend({
		template : '#article-template',

		templateHelpers: {
			prettyDate: function (time) {
				var date = new Date(time);
				var	diff = (((new Date()).getTime() - date.getTime()) / 1000),
					day_diff = Math.floor(diff / 86400);

				if ( isNaN(day_diff) || day_diff < 0 )
					return;

				return day_diff == 0 && (
						diff < 60 && "moments ago" ||
						diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
						diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
					day_diff == 1 && "Yesterday" ||
					day_diff < 7 && day_diff + " days ago" ||
					day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago" ||
					day_diff < 365 && Math.ceil( day_diff / 30.5 ) + " months ago" ||
					day_diff > 365 && Math.ceil( day_diff / 365 ) + " years ago"
			},

			getContent: function () {
				if (this.content && this.content.content)
					return this.content.content;
				if (this.summary && this.summary.content)
					return this.summary.content;
				return "";
			},

			getItemClass: function () {
				var className = '';

				var categories = this.categories;
				if (categories && categories.length > 0) {
					if (categories.indexOf ('state/read') >= 0)
						className += ' read';
					if (categories.indexOf ('state/markasread') >= 0)
						className += ' markasread';
					if (categories.indexOf ('state/starred') >= 0)
						className += ' starred';
				}

				return className;
			}
		},

		initialize : function () {
		},

		events: {
			'click div.article-origin': 'originClicked',
			'click a': 'linkClicked'
		},

		originClicked: function (event) {
			event.preventDefault ();

			var origin = this.model.get ('origin');
			if (!origin || !origin.streamId)
				return;

			var url = '#stream/' + encodeURIComponent(origin.streamId);
			App.router.navigate (url, {trigger: true, replace: (window.location.hash.indexOf ('#stream/') == 0)});
		},

		linkClicked: function (event) {
			event.preventDefault ();

			window.open(event.target.href);
		},

		modelEvents: {
			'change': 'changed'
		},

		changed: function () {
			var newCategories = this.model.get ('categories');
			var oldCategories = this.model.previous ('categories');
			if (newCategories.indexOf ('state/starred') >= 0 && oldCategories.indexOf ('state/starred') < 0)
				$('.article-item').addClass ('starred');
			if (newCategories.indexOf ('state/starred') < 0 && oldCategories.indexOf ('state/starred') >= 0)
				$('.article-item').removeClass ('starred');
			if (newCategories.indexOf ('state/read') >= 0 && oldCategories.indexOf ('state/read') < 0)
				$('.article-item').addClass ('read');
			if (newCategories.indexOf ('state/read') < 0 && oldCategories.indexOf ('state/read') >= 0)
				$('.article-item').removeClass ('read');
			if (newCategories.indexOf ('state/markasread') >= 0 && oldCategories.indexOf ('state/markasread') < 0)
				$('.article-item').addClass ('markasread');
			if (newCategories.indexOf ('state/markasread') < 0 && oldCategories.indexOf ('state/markasread') >= 0)
				$('.article-item').removeClass ('markasread');
		},

		onRender: function () {
			if (this.model.isRead ())
				$('.article-item').addClass ('read');
			else
				$('.article-item').removeClass ('read');
			if (this.model.isMarkAsRead ())
				$('.article-item').addClass ('markasread');
			else
				$('.article-item').removeClass ('markasread');
			if (this.model.isStarred ())
				$('.article-item').addClass ('starred');
			else
				$('.article-item').removeClass ('starred');

			var imgs = $('.article-item').find ('img');
			imgs.removeAttr ('width');
			imgs.removeAttr ('height');
		}

	});

	var AppRouter = Backbone.Router.extend({
		initialize: function() {
			this.routesHit = 0;
			// keep count of number of routes handled by your application
			Backbone.history.on('route', function() {
				this.routesHit++;
			}, this);

			this.mark_timer = null;
		},

		back: function() {
			if (this.routesHit > 1) {
				// more than one route hit -> user did not land to current page
				// directly
				window.history.back();
			} else {
				// otherwise go to the home page. Use replaceState if available
				// so
				// the navigation doesn't create an extra history entry
				this.navigate('#stream/' + encodeURIComponent ('state/reading-list'), {trigger : true, replace : true });
			}
		},

		next: function () {
		},

		routes: {
			'item/:id': "itemView",
			'stream/*query': "streamView"
		},

		//
		itemView: function (id) {
			App.vent.trigger ('article:change', id);
		},

		streamView: function (query) {
			var url = 'stream/' + encodeURIComponent (query);

			if (App.indexList.url == url) {
				// 发送事件，调整当前文章，目录列表等进行对应调整
				App.indexList.trigger ('article:current-change', App.indexList.currentId);
				return;
			}

			App.vent.trigger ('stream:reset', url);
		}
	});

	/**
	 * App.storage
	 */
	var AppStorage = Backbone.Marionette.Controller.extend ({
		_cached_items: new ArticleList ([], {model: Article, url: '', page_size: 20, continuation: ''}),

		_feeds: new FeedList (),
		_labels: new LabelList (),

		initialize: function() {
			var that = this;

			if (subscriptionData) {
				var subscriptions = (subscriptionData && subscriptionData.subscriptions) || [];
				that.buildLabels (subscriptions);

				// 保存 subscriptions 数据，用于离线时使用
				// 以后会定时更新 subscriptions 数据
				that.save ('subscriptions');
			} else {
				that.load ('subscriptions');

				that.buildLabels ();
			}

			if (streamData) {
				var items = (streamData && streamData.items) || [];
				for (var i = 0; i < items.length; i ++)
					that._cached_items.add (new Article (items [i]));

				that.save ('items');
			} else {
				that.load ('items');
			}
		},

		getItem: function (id) {
			// 如果在 cached 中不存在，从服务器请求
			return this._cached_items.get (id);
		},

		getItems: function (collection, callback) {
			var that = this;

			if (isDebugOn) {
				setTimeout (function () {
					var limit = collection.length + collection.page_size;
					for (var i = collection.length; i < that._cached_items.length && i < limit; i ++) {
						collection.add (that._cached_items.at (i));
					}
					callback && callback ();
				}, 200);
				return;
			}

			// collection.continuation 无效说明不用往后加载
			// XXX 除非刚刚开始
			if (!collection.continuation && collection.size () > 0) {
				callback && callback ();
				return;
			}

			// collection.url, collection.continuation, collectioni.limit
			var url = '/reader/api/0/stream/contents/' + collection.url.substring ('stream/'.length) + '?n=' + collection.page_size + '&ck=' + $.now ();
			if (collection.continuation)
				url += '&c=' + collection.continuation;

			var filter = this.getStreamFilter ();
			if (filter && filter != 'state/reading-list')
				url += '&filter=' + filter;

			// 1, 加载: 用 POST 方法请求数据，并且报告本地已经 缓存的数据 (id, updated)
			$.ajax ({url:url, dataType:'json', type: 'POST', dataType: 'JSON', data: JSON.stringify({'version': '1.0', 'items': this.getCachedItems (collection)}) })
				.done (function (data) {
					// 2, 数据合并到 _cached_items
					// 3, 数据追加到 collection
					var bItemsChanged = false;
					for (var i = 0; i < data.items.length; i ++) {
						var newItem = data.items[i];
						if (!newItem.cached) { // 不是 cached 项目
							var newModel = new Article (newItem);
							that._cached_items.add (newModel);
							collection.add (newModel);

							bItemsChanged = true;
						} else { // cached 项目，
							var cachedModel = that._cached_items.get (newItem.id);
							if (newItem.categories) { // 可能会修改 categories (状态)
								// 增加或删除 read, starred, markasread
								var newCategories = newItem.categories;
								var oldCategories = _.clone (cachedModel.get ('categories'));

								var bItemChanged = false;
								if (newCategories.indexOf ('state/starred') >= 0 && oldCategories.indexOf ('state/starred') < 0) {
									oldCategories.push ('state/starred');
									bItemChanged = true;
								}
								if (newCategories.indexOf ('state/starred') < 0 && oldCategories.indexOf ('state/starred') >= 0) {
									oldCategories.splice (oldCategories.indexOf ('state/starred'));
									bItemChanged = true;
								}
								if (newCategories.indexOf ('state/read') >= 0 && oldCategories.indexOf ('state/read') < 0) {
									oldCategories.push ('state/read');
									bItemChanged = true;
								}
								if (newCategories.indexOf ('state/read') < 0 && oldCategories.indexOf ('state/read') >= 0) {
									oldCategories.splice (oldCategories.indexOf ('state/read'));
									bItemChanged = true;
								}
								if (newCategories.indexOf ('state/markasread') >= 0 && oldCategories.indexOf ('state/markasread') < 0) {
									oldCategories.push ('state/markasread');
									bItemChanged = true;
								}
								if (newCategories.indexOf ('state/markasread') < 0 && oldCategories.indexOf ('state/markasread') >= 0) {
									oldCategories.splice (oldCategories.indexOf ('state/markasread'));
									bItemChanged = true;
								}

								if (bItemChanged) {
									cachedModel.set ('categories', oldCategories);
									bItemsChanged = true;
								}
							}

							if (cachedModel)
								collection.add (cachedModel);
						}
					}

					collection.continuation = data.continuation;

					if (bItemsChanged)
						that.save ('items');

					// 加载成功
				}).fail (function () {
					// 加载失败
				}).always(function() {
					// console.log ("complete");

					callback && callback ();
				});
		},

		// 获得当前 collection 对应的缓存项目列表，用于性能改进或离线
		// XXX 根据 streamId 进行优化
		getCachedItems: function (collection) {
			// collection.url = 'stream/feed/...', 'stream/label/...', 'stream/state/...'
			var streamId = collection.url || '';
			streamId = decodeURIComponent (streamId);
			if (streamId.indexOf ('stream/') == 0)
				streamId = streamId.substring ('stream/'.length);

			var filter = this.getStreamFilter ();

			var cached_items = [];

			var t = parseInt ($.now () / 1000);
			if (collection.length > 0)
				t = collection.last ().get ('updated');

			var cached_item = null;
			for (var i = 0; i < this._cached_items.length; i ++) {
				cached_item = this._cached_items.at (i);
				if (cached_item.get ('updated') > t)
					continue;

				var categories = cached_item.get ('categories') || [];
				if (streamId.indexOf ('label/') == 0) {
					if (categories.indexOf (streamId) < 0)
						continue;
				} else if (streamId.indexOf ('feed/') == 0) {
					if (cached_item.get ('origin') && cached_item.get ('origin').streamId != streamId)
						continue;
				} else if (streamId.indexOf ('state/') == 0) {
					if (streamId == 'state/unread') {
						if (categories.indexOf ('state/read') >= 0 || categories.indexOf ('state/markasread') >= 0)
							continue;
					} else if (streamId == 'state/starred') {
						if (categories.indexOf ('state/starred') < 0)
							continue;
					}
				}

				if (filter == 'state/unread') {
					if (categories.indexOf ('state/read') >= 0 || categories.indexOf ('state/markasread') >= 0)
						continue;
				} else if (filter == 'state/starred') {
					if (categories.indexOf ('state/starred') < 0)
						continue;
				}

				cached_items.push ({'id': cached_item.id, 'updated': cached_item.get('updated')});
			}

			cached_items.sort (function (a, b) {return b.updated - a.updated;});

			return _.head (cached_items, collection.page_size*2);
		},

		getFeed: function (streamId) {
			return this._feeds.get (streamId);
		},

		getFeeds: function () {
			return this._feeds;
		},
		getLabel: function (label) {
			return this._labels.get (label);
		},

		getLabels: function () {
			return this._labels;
		},

		rebuildLabels: function () {
			// 初始化 labels, feeds
			var newLabels = new LabelList ();

			var allLabel = new Label ({'id': '***ALL***', 'title': 'All', 'feeds': new FeedList ()});
			var othersLabel = new Label ({'id': '***OTHERS***', 'title': 'Others', 'feeds': new FeedList ()});
			var mutesLabel = new Label ({'id': '***MUTES***', 'title': 'Mutes', 'feeds': new FeedList ()});

			var max_read_count = 100; // 每个feed最大参与统计数 (已读)
			var max_markasread_count = 100; // 每个feed最大参与统计数 (标记为已读)

			newLabels.add (allLabel);
			newLabels.add (othersLabel);
			newLabels.add (mutesLabel);

			var feeds = this._feeds.models;

			var that = this;

			_.each(feeds, function (newFeed) {
				allLabel.get('feeds').add (newFeed);
				allLabel.set('all_count', allLabel.get('all_count') + (newFeed.get('all_count')));
				allLabel.set('unread_count', allLabel.get('unread_count') + (newFeed.get('unread_count')));
				allLabel.set('starred_count', allLabel.get('starred_count') + (newFeed.get('starred_count')));
				allLabel.set('markasread_count', allLabel.get('markasread_count') + Math.min(max_markasread_count, newFeed.get('markasread_count')));
				allLabel.set('read_count', allLabel.get('read_count') + Math.min(max_read_count, newFeed.get('read_count')));

				if (newFeed.get('mute')) {
					// mute 项目，忽略
					mutesLabel.get('feeds').add (newFeed);

					mutesLabel.set('all_count', mutesLabel.get('all_count') + (newFeed.get('all_count')));
					mutesLabel.set('unread_count', mutesLabel.get('unread_count') + (newFeed.get('unread_count')));
					mutesLabel.set('starred_count', mutesLabel.get('starred_count') + (newFeed.get('starred_count')));
					mutesLabel.set('markasread_count', mutesLabel.get('markasread_count') + Math.min(max_markasread_count, newFeed.get('markasread_count')));
					mutesLabel.set('read_count', mutesLabel.get('read_count') + Math.min(max_read_count, newFeed.get('read_count')));
				}

				if (!newFeed.get('categories') || newFeed.get('categories').length == 0) {
					othersLabel.get('feeds').add (newFeed);

					othersLabel.set('all_count', othersLabel.get('all_count') + (newFeed.get('all_count')));
					othersLabel.set('unread_count', othersLabel.get('unread_count') + (newFeed.get('unread_count')));
					othersLabel.set('starred_count', othersLabel.get('starred_count') + (newFeed.get('starred_count')));
					othersLabel.set('markasread_count', othersLabel.get('markasread_count') + Math.min(max_markasread_count, newFeed.get('markasread_count')));
					othersLabel.set('read_count', othersLabel.get('read_count') + Math.min(max_read_count, newFeed.get('read_count')));
				} else {
					_.each (newFeed.get('categories'), function (category) {
						// 如果是新的分类，创建分类
						var label = newLabels.get (category);
						if (!label) {
							label = new Label ({'id': category, 'title': category, 'feeds': new FeedList ()});
							newLabels.add (label);
						}
						label.get('feeds').add (newFeed);

						label.set('all_count', label.get('all_count') + (newFeed.get('all_count')));
						label.set('unread_count', label.get('unread_count') + (newFeed.get('unread_count')));
						label.set('starred_count', label.get('starred_count') + (newFeed.get('starred_count')));
						label.set('markasread_count', label.get('markasread_count') + Math.min(max_markasread_count, newFeed.get('markasread_count')));
						label.set('read_count', label.get('read_count') + Math.min(max_read_count, newFeed.get('read_count')));
					});
				}
			});

			// 排序
			newLabels.forEach (function (label) {
				label.get('feeds').sort ();
			});
			newLabels.sort ();

			this._labels.reset (newLabels.models);
		},

		buildLabels: function (feeds) {
			// 初始化 labels, feeds
			this._labels.reset ();

			var allLabel = new Label ({'id': '***ALL***', 'title': 'All', 'feeds': new FeedList ()});
			var othersLabel = new Label ({'id': '***OTHERS***', 'title': 'Others', 'feeds': new FeedList ()});
			var mutesLabel = new Label ({'id': '***MUTES***', 'title': 'Mutes', 'feeds': new FeedList ()});

			var max_read_count = 100; // 每个feed最大参与统计数 (已读)
			var max_markasread_count = 100; // 每个feed最大参与统计数 (标记为已读)

			this._labels.add (allLabel);
			this._labels.add (othersLabel);
			this._labels.add (mutesLabel);

			// feeds = feeds;

			var that = this;

			_.each(feeds, function (feed) {
				var newFeed = new Feed (feed);
				that._feeds.add (newFeed);

				allLabel.get('feeds').add (newFeed);
				allLabel.set('all_count', allLabel.get('all_count') + (newFeed.get('all_count')));
				allLabel.set('unread_count', allLabel.get('unread_count') + (newFeed.get('unread_count')));
				allLabel.set('starred_count', allLabel.get('starred_count') + (newFeed.get('starred_count')));
				allLabel.set('markasread_count', allLabel.get('markasread_count') + Math.min(max_markasread_count, newFeed.get('markasread_count')));
				allLabel.set('read_count', allLabel.get('read_count') + Math.min(max_read_count, newFeed.get('read_count')));

				if (feed.mute) {
					mutesLabel.get('feeds').add (newFeed);

					mutesLabel.set('all_count', mutesLabel.get('all_count') + (newFeed.get('all_count')));
					mutesLabel.set('unread_count', mutesLabel.get('unread_count') + (newFeed.get('unread_count')));
					mutesLabel.set('starred_count', mutesLabel.get('starred_count') + (newFeed.get('starred_count')));
					mutesLabel.set('markasread_count', mutesLabel.get('markasread_count') + Math.min(max_markasread_count, newFeed.get('markasread_count')));
					mutesLabel.set('read_count', mutesLabel.get('read_count') + Math.min(max_read_count, newFeed.get('read_count')));
				}

				if (!feed.categories || feed.categories.length == 0) {
					othersLabel.get('feeds').add (newFeed);

					othersLabel.set('all_count', othersLabel.get('all_count') + (newFeed.get('all_count')));
					othersLabel.set('unread_count', othersLabel.get('unread_count') + (newFeed.get('unread_count')));
					othersLabel.set('starred_count', othersLabel.get('starred_count') + (newFeed.get('starred_count')));
					othersLabel.set('markasread_count', othersLabel.get('markasread_count') + Math.min(max_markasread_count, newFeed.get('markasread_count')));
					othersLabel.set('read_count', othersLabel.get('read_count') + Math.min(max_read_count, newFeed.get('read_count')));
				} else {
					_.each (feed.categories, function (category) {
						// 如果是新的分类，创建分类
						var label = that._labels.get (category);
						if (!label) {
							label = new Label ({'id': category, 'title': category, 'feeds': new FeedList ()});
							that._labels.add (label);
						}
						label.get('feeds').add (newFeed);

						label.set('all_count', label.get('all_count') + (newFeed.get('all_count')));
						label.set('unread_count', label.get('unread_count') + (newFeed.get('unread_count')));
						label.set('starred_count', label.get('starred_count') + (newFeed.get('starred_count')));
						label.set('markasread_count', label.get('markasread_count') + Math.min(max_markasread_count, newFeed.get('markasread_count')));
						label.set('read_count', label.get('read_count') + Math.min(max_read_count, newFeed.get('read_count')));
					});
				}
			});

			// 排序
			this._labels.forEach (function (label) {
				label.get('feeds').sort ();
			});
			this._labels.sort ();
		},

		mark: function (obj, name) {
			var that = this;

			if (!obj) { // mark all as read
				if (name != 'markasread') {
					// 错误
					console.error ("错误：name 必须为 markasread");
					return;
				}

				// $.ajax ({url:'/reader/api/0/mark-all-as-read' + '?ck=' + $.now (), type: 'POST', data: 's=state/reading-list' })
				$.ajax ({url:'/reader/api/0/mark-all-as-read' + '?ck=' + $.now (), type: 'POST', data: {"s": "state/reading-list"} })
					.done (function (data) {
						var feeds = that._feeds;
						_.each (feeds, function (feed) {
							feed.set ('unread_count', 0);
						});

						// 相关的文章也需要设置为已读
						for (var i = 0; i < that._cached_items.length; i ++) {
							var item = that._cached_items.at (i);

							var categories = _.clone(item.get ('categories'));
							if (categories.indexOf ('state/read') < 0 && categories.indexOf ('state/markasread') < 0) { // XXX
								categories.push ('state/markasread');
								item.set ('categories', categories);
							}
						}
					}).fail (function () {
					}).always(function() {
						// console.log ("complete");
					});
			} else if (obj instanceof Article) { // 具体某篇文章
				var streamId = obj.get ('origin').streamId;
				var feed = this.getFeed (streamId);
				if (!feed)
					return;

				switch (name) {
				case 'read':
				case 'markasread':
					var state = 'state/' + name;

					var categories = _.clone(obj.get ('categories'));
					if (categories.indexOf ('state/read') < 0 && categories.indexOf ('state/markasread') < 0) {
						categories.push (state);
						obj.set ('categories', categories);
						feed.set ('unread_count', Math.max(0, feed.get ('unread_count') - 1));
						feed.set (name + '_count', feed.get (name + '_count') + 1);

						if (isDebugOn)
							break;

						// a=state/read&i=obj.id
						//$.ajax ({url:'/reader/api/0/edit-tag' + '?ck=' + $.now (), type: 'POST', data: "a=" + state + "&i=" + obj.id })
						$.ajax ({url:'/reader/api/0/edit-tag' + '?ck=' + $.now (), type: 'POST', data: {"a": state, "i": obj.id} })
							.done (function (data) {
							}).fail (function () {
								categories = _.clone (categories);
								categories.splice (categories.indexOf (state), 1);
								obj.set ('categories', categories);
								feed.set ('unread_count', feed.get ('unread_count') + 1);
								feed.set (name + '_count', feed.get (name + '_count') - 1);
							}).always(function() {
								// console.log ("complete");
							});
					}
					break;

				case 'unread':
					var categories = _.clone(obj.get ('categories'));

					var bRead = (categories.indexOf ('state/read') >= 0);
					var bMarkAsRead = (categories.indexOf ('state/markasread') >= 0);

					if (bRead || bMarkAsRead) {
						bRead && categories.splice (categories.indexOf ('state/read'), 1);
						bMarkAsRead && categories.splice (categories.indexOf ('state/markasread'), 1);
						obj.set ('categories', categories);
						feed.set ('unread_count', feed.get ('unread_count') + 1);

						if (bRead)
							feed.set ('read_count', feed.get ('read_count') - 1);
						else
							feed.set ('markasread_count', feed.get ('markasread_count') - 1);

						if (isDebugOn)
							break;

						// r=state/read&i=obj.id
						// $.ajax ({url:'/reader/api/0/edit-tag' + '?ck=' + $.now (), type: 'POST', data: "r=state/read&i=" + obj.id })
						$.ajax ({url:'/reader/api/0/edit-tag' + '?ck=' + $.now (), type: 'POST', data: {"r": "state/read", "i": obj.id} })
							.done (function (data) {
							}).fail (function () {
								categories = _.clone (categories);
								bRead && categories.push ('state/read');
								bMarkAsRead && categories.push ('state/markasread');
								obj.set ('categories', categories);
								feed.set ('unread_count', feed.get ('unread_count') - 1);
								if (bRead)
									feed.set ('read_count', feed.get ('read_count') + 1);
								else
									feed.set ('markasread_count', feed.get ('markasread_count') + 1);
							}).always(function() {
								// console.log ("complete");
							});
					}
					break;

				case 'star':
					var categories = _.clone(obj.get ('categories'));
					if (categories.indexOf ('state/starred') < 0) {
						categories.push ('state/starred');
						obj.set ('categories', categories);
						feed.set ('starred_count', feed.get ('starred_count') + 1);

						if (isDebugOn)
							break;

						// a=state/starred&i=obj.id
						//$.ajax ({url:'/reader/api/0/edit-tag' + '?ck=' + $.now (), type: 'POST', data: "a=state/starred&i=" + obj.id })
						$.ajax ({url:'/reader/api/0/edit-tag' + '?ck=' + $.now (), type: 'POST', data: {"a": "state/starred", "i": obj.id} })
							.done (function (data) {
							}).fail (function () {
								categories = _.clone (categories);
								categories.splice (categories.indexOf ('state/starred'), 1);
								obj.set ('categories', categories);
								feed.set ('starred_count', feed.get ('starred_count') - 1);
							}).always(function() {
								// console.log ("complete");
							});
					}
					break;

				case 'unstar':
					var categories = _.clone(obj.get ('categories'));
					if (categories.indexOf ('state/starred') >= 0) {
						categories.splice (categories.indexOf ('state/starred'), 1);
						obj.set ('categories', categories);
						feed.set ('starred_count', feed.get ('starred_count') - 1);

						if (isDebugOn)
							break;

						// r=state/starred&i=obj.id
						// $.ajax ({url:'/reader/api/0/edit-tag' + '?ck=' + $.now (), type: 'POST', data: "r=state/starred&i=" + obj.id })
						$.ajax ({url:'/reader/api/0/edit-tag' + '?ck=' + $.now (), type: 'POST', data: {"r": "state/starred", "i": obj.id} })
							.done (function (data) {
							}).fail (function () {
								categories = _.clone (categories);
								categories.push ('state/starred');
								obj.set ('categories', categories);
								feed.set ('starred_count', feed.get ('starred_count') + 1);
							}).always(function() {
								// console.log ("complete");
							});
					}
					break;
				}
			} else if (obj instanceof Feed) { // 设置 feed 为已读
				if (name != 'markasread') {
					console.error ("错误：在 feed 上执行 mark 时，name 必须为 markasread");
					return;
				}

				//$.ajax ({url:'/reader/api/0/mark-all-as-read' + '?ck=' + $.now (), type: 'POST', data: 's=' + encodeURIComponent(obj.id) + '&t=' + encodeURIComponent(obj.get('title')) })
				$.ajax ({url:'/reader/api/0/mark-all-as-read' + '?ck=' + $.now (), type: 'POST', data: {"s": obj.id, "t": obj.get('title')} })
					.done (function (data) {
						obj.set ('unread_count', 0);

						// 相关的文章也需要设置为已读
						for (var i = 0; i < that._cached_items.length; i ++) {
							var item = that._cached_items.at (i);

							if (item.get ('origin').streamId != obj.id)
								continue;

							var categories = _.clone(item.get ('categories'));
							if (categories.indexOf ('state/read') < 0 && categories.indexOf ('state/markasread') < 0) { // XXX
								categories.push ('state/markasread');
								item.set ('categories', categories);
							}
						}
					}).fail (function () {
					}).always(function() {
						// console.log ("complete");
					});
			} else if (obj instanceof Label) {
				if (name != 'markasread') {
					console.error ("错误：在 label 上执行 mark 时，name 必须为 markasread");
					return;
				}
				if (obj.id == '***MUTES***') {
					console.error ("错误：不能在 ***MUTES*** 上执行 mark 操作");
					return;
				}
				var label = '';
				if (obj.id == '***ALL***')
					label = 'state/reading-list';
				else if (obj.id == '***OTHERS***')
					label = 'label/';
				else
					label = 'label/' + obj.id;

				//$.ajax ({url:'/reader/api/0/mark-all-as-read' + '?ck=' + $.now (), type: 'POST', data: 's=' + encodeURIComponent(label) + '&t=' + encodeURIComponent(obj.get('title')) })
				$.ajax ({url:'/reader/api/0/mark-all-as-read' + '?ck=' + $.now (), type: 'POST', data: {"s": label, "t": obj.get('title')} })
					.done (function (data) {
						var feeds = obj.get ('feeds').models;
						_.each (feeds, function (feed) {
							feed.set ('unread_count', 0);

							// 相关的文章也需要设置为已读
							for (var i = 0; i < that._cached_items.length; i ++) {
								var item = that._cached_items.at (i);

								if (item.get ('origin').streamId != feed.id)
									continue;

								var categories = _.clone(item.get ('categories'));
								if (categories.indexOf ('state/read') < 0 && categories.indexOf ('state/markasread') < 0) {
									categories.push ('state/markasread');
									item.set ('categories', categories);
								}
							}
						});
					}).fail (function () {
					}).always(function() {
						// console.log ("complete");
					});
			} else {
				// console.error ("错误：不支持的 obj 类型");
				return;
			}

			this.save ('items');
		},

		subscriptionList: function () {
			var that = this;

			$.ajax ({url:'/reader/api/0/subscription/list' + '?ck=' + $.now (), type: 'POST'})
				.done (function (subscriptionData) {
					var subscriptions = (subscriptionData && subscriptionData.subscriptions) || [];
					//that.buildLabels (subscriptions);
					that._feeds.reset (subscriptions);
					that.rebuildLabels ();
				}).fail (function () {
				}).always(function() {
					//console.log ("complete");
				});
		},

		// name: mute, unmute, subscribe, unsubscribe, edit(title, addLabel, removeLabel)
		subscriptionEdit: function (streamId, action, title, a, r) {
			var that = this;

			var feed = this.getFeed (streamId);
			if (!feed)
				return;

			switch (action) {
			case 'mute':
			case 'unmute':
				if (feed.mute != (action == 'mute')) {
					feed.set ('mute', (action == 'mute'));

					if (isDebugOn)
						break;

					// ac=mute|unmute
					//$.ajax ({url:'/reader/api/0/subscription/edit' + '?ck=' + $.now (), type: 'POST', data: "s=" + encodeURIComponent(streamId) + "&ac=" + action })
					$.ajax ({url:'/reader/api/0/subscription/edit' + '?ck=' + $.now (), type: 'POST', data: {"s": streamId, "ac": action} })
						.done (function (data) {
						}).fail (function () {
							feed.set ('mute', (action != 'mute'));
						}).always(function() {
							//console.log ("complete");
						});
				}
				break;

			case 'subscribe':
				break;

			case 'unsubscribe':
				//$.ajax ({url:'/reader/api/0/subscription/edit' + '?ck=' + $.now (), type: 'POST', data: "s=" + encodeURIComponent(streamId) + "&ac=" + action })
				$.ajax ({url:'/reader/api/0/subscription/edit' + '?ck=' + $.now (), type: 'POST', data: {"s": streamId, "ac": action} })
					.done (function (data) {
						that._feeds.remove (feed);
						that.rebuildLabels ();
					}).fail (function () {
					}).always(function() {
						//console.log ("complete");
					});
				break;

			case 'edit':
				var oldTitle = _.clone (feed.get ('title'));
				if (title)
					feed.set ('title', title);

				var oldLabels = _.clone (feed.get ('categories'));
				var newLabels = _.clone (feed.get ('categories'));
				if (a && a != '') {
					if (newLabels.indexOf (a) < 0)
						newLabels.push (a);
				}
				if (r && r != '') {
					if (newLabels.indexOf (r) >= 0)
						newLabels.splice (newLabels.indexOf (r), 1);
				}
				feed.set ('categories', newLabels);

				if (isDebugOn)
					break;

				// ac=mute|unmute
				//$.ajax ({url:'/reader/api/0/subscription/edit' + '?ck=' + $.now (), type: 'POST', data: "s=" + encodeURIComponent(streamId) + "&ac=" + action + '&title=' + encodeURIComponent(title) + '&a=' + a + '&r=' + r })
				$.ajax ({url:'/reader/api/0/subscription/edit' + '?ck=' + $.now (), type: 'POST', data: {"s": streamId, "ac": action, "title": title, "a": a, "r": r} })
					.done (function (data) {
					}).fail (function () {
						feed.set ('title', oldTitle);
						feed.set ('categories', oldLabels);
					}).always(function() {
						//console.log ("complete");
					});
				break;
			}

			this.save ('subscriptions');
		},

		subscriptionQuickAdd: function (query, callback) {
			//$.ajax ({url:'/reader/api/0/subscription/quickadd' + '?ck=' + $.now (), type: 'POST', data: "quickadd=" + encodeURIComponent(query) })
			$.ajax ({url:'/reader/api/0/subscription/quickadd' + '?ck=' + $.now (), type: 'POST', data: {"quickadd":query} })
				.done (function (data) {
					callback (data);
				}).fail (function () {
					// 显示错误信息
					callback ();
				}).always(function() {
				});
		},

		labelRename: function (oldLabel, newLabel) {
			var that = this;

			//$.ajax ({url:'/reader/api/0/rename-tag' + '?ck=' + $.now (), type: 'POST', data: "s=" + encodeURIComponent(oldLabel) + "&dest=" + encodeURIComponent(newLabel) })
			$.ajax ({url:'/reader/api/0/rename-tag' + '?ck=' + $.now (), type: 'POST', data: {"s": oldLabel, "dest": newLabel} })
				.done (function (data) {
					var feeds = that._feeds.models;
					_.each(feeds, function (feed) {
						var labels = feed.get ('categories');
						if (!labels || labels.length == 0)
							return;
						if (labels.indexOf (oldLabel) < 0)
							return;
						labels[labels.indexOf (oldLabel)] = newLabel;
					});

					that.rebuildLabels ();
				}).fail (function () {
				}).always(function() {
					//console.log ("complete");
				});
		},

		labelRemove: function (oldLabel) {
			var that = this;

			if (oldLabel == '***ALL***') {
				//console.log ('错误：不能删除 All 订阅');
				return -1;
			} else if (oldLabel == '***MUTES***') {
				//console.log ('错误：不能删除 Mutes 订阅');
				return -1;
			} else if (oldLabel == '***OTHERS***') {
				//console.log ('错误：不能删除 Others 订阅');
				return -1;
			}

			//$.ajax ({url:'/reader/api/0/disable-tag' + '?ck=' + $.now (), type: 'POST', data: "s=" + encodeURIComponent(oldLabel) })
			$.ajax ({url:'/reader/api/0/disable-tag' + '?ck=' + $.now (), type: 'POST', data: {"s": oldLabel} })
				.done (function (data) {
					var feeds = that._feeds.models;
					_.each(feeds, function (feed) {
						var labels = feed.get ('categories');
						if (!labels || labels.length == 0)
							return;
						if (labels.indexOf (oldLabel) < 0)
							return;
						labels.splice(labels.indexOf (oldLabel), 1);
					});

					that.rebuildLabels ();
				}).fail (function () {
				}).always(function() {
					//console.log ("complete");
				});
		},

		labelEmpty: function (oldLabel) {
			var that = this;

			if (oldLabel == '***ALL***') {
				//console.log ('错误：不能清除 All 订阅');
				return -1;
			} else if (oldLabel == '***MUTES***') {
				//console.log ('错误：不能清除 Mutes 订阅');
				//return -1;
			} else if (oldLabel == '***OTHERS***') {
				oldLabel = '';
			}

			//$.ajax ({url:'/reader/api/0/empty-tag' + '?ck=' + $.now (), type: 'POST', data: "s=" + encodeURIComponent(oldLabel) })
			$.ajax ({url:'/reader/api/0/empty-tag' + '?ck=' + $.now (), type: 'POST', data: {"s": oldLabel} })
				.done (function (data) {
					var feeds = that._feeds.models;

					// 删除所有含有指定 label 的订阅
					var subfeeds = [];
					_.each(feeds, function (feed) {
						var labels = feed.get ('categories');
						if (oldLabel == '' && (!labels || labels.length == 0)) {
							subfeeds.push (feed);
							return;
						}
						if (oldLabel == '***MUTES***' && feed.get ('mute')) {
							subfeeds.push (feed);
							return;
						}
						if (labels.indexOf (oldLabel) >= 0) {
							subfeeds.push (feed);
							return;
						}
					});

					that._feeds.remove (subfeeds);

					that.rebuildLabels ();
				}).fail (function () {
				}).always(function() {
					//console.log ("complete");
				});
		},

		setStreamFilter: function (name) {
			var filter = '';
			switch (name) {
			case 'state/reading-list':
				filter = name;
				break;
			case 'state/unread':
				filter = name;
				break;
			case 'state/starred':
				filter = name;
				break;
			default:
				filter = 'state/reading-list';
				break;
			}

			localStorage.setItem ("storage-stream-filter", filter);
		},

		setStreamId: function (streamId) {
			localStorage.setItem ("storage-stream-id", streamId);
		},

		getStreamFilter: function () {
			return localStorage.getItem ("storage-stream-filter") || 'state/reading-list';
		},

		getStreamId: function () {
			return localStorage.getItem ("storage-stream-id") || 'state/reading-list';
		},

		load: function (name) {
			switch (name) {
			case 'subscriptions':
				try {
					this._feeds.reset (JSON.parse (localStorage.getItem ('subsubscriptions') || '[]'));
				} catch (e) {
					this._feeds.reset ();
				}
				break;
			case 'items':
				try {
					this._cached_items.reset (JSON.parse (localStorage.getItem ('items') || '[]'));
				} catch (e) {
					this._cached_items.reset ();
				}
				break;
			}
		},

		save: function (name) {
			switch (name) {
			case 'subscriptions':
				try {
					localStorage.removeItem ('subscriptions');
					localStorage.setItem ('subsubscriptions', JSON.stringify (this._feeds.toJSON ()));
				} catch (e) {
				}
				break;
			case 'items':
				// 只保留最新的 100 条
				// 如果空间不够怎么办？
				var items = this._cached_items.toJSON ();
				if (items.length > 100) {
					items.sort (function (a, b) {return b.updated - a.updated;});
					items.length = 100;
				}

				try  {
					localStorage.removeItem ('items');
					localStorage.setItem ('items', JSON.stringify (items));
				} catch (e) {
				}
				break;
			}
		}
	});

	/**
	 * 屏幕管理，设备适配
	 */
	AppScreen = Backbone.Marionette.Controller.extend ({
		initialize: function() {
			var uaMatched = this.uaMatch( navigator.userAgent );

			this.browser = uaMatched.browser;
			this.version = uaMatched.version;
			this.mobile = (navigator.platform.indexOf("iPhone") != -1 || navigator.platform.indexOf("iPod") != -1 || navigator.platform.indexOf("iPad") != -1 );

			if (this.browser)
				$(document.body).addClass (this.browser);

			if (this.mobile)
				$(document.body).addClass ('mobile');
		},

		uaMatch: function (ua) {
		    ua = ua.toLowerCase();

		    var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
		        /(webkit)[ \/]([\w.]+)/.exec( ua ) ||
		        /(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
		        /(msie) ([\w.]+)/.exec( ua ) ||
		        ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
		        [];

		    return {
		        browser: match[ 1 ] || "",
		        version: match[ 2 ] || "0"
		    };
		}
	});

	/**
	 * 键盘处理器
	 *
	 * 替代系统缺省事件处理
	 */
	AppKeyboard = Backbone.Marionette.Controller.extend ({
		initialize: function() {
			$(document).keydown (this.keydown);
			$(document).keyup (this.keyup);
		},

		keyup: function (event) {
			// 忽略 input 上的消息
			if (event.target.tagName == 'INPUT')
				return;

			//
			if ($('.ui-container').hasClass ('on'))
				return;

			// 通知 设置焦点到正文区
			App.vent.trigger ('article:focus');

			if (!App.articleView || !App.articleView.model)
				return;

			var processed = false;

			switch (event.keyCode) {
			case 32: // space/shift-space, 向下/向上翻页
				var scroller = $(App.articleView.options.scroller);
				var scrollTop = scroller.scrollTop ();
				var outerHeight = scroller.outerHeight ()
				if (event.shiftKey) {
					// 如果已经滚动到顶头，article:prev
					if (scrollTop == 0) {
						App.vent.trigger ('article:prev', App.articleView.model.id);
					} else {
						scroller.animate({scrollTop: Math.max(0, scrollTop - (outerHeight-40))});
					}
				} else {
					var totalHeight = scroller.get(0).scrollHeight;
					// 如果已经滚动到下头，article:next
					if (scrollTop + outerHeight >= totalHeight) {
						App.vent.trigger ('article:next', App.articleView.model.id);
					} else {
						scroller.animate({scrollTop: Math.min(totalHeight-outerHeight, scrollTop + (outerHeight-40))});
					}
				}
				processed = true;
				break;
			}

			if (processed)
				event.preventDefault ();
		},

		keydown: function (event) {
			// 忽略 input 上的消息
			if (event.target.tagName == 'INPUT')
				return;

			if ($('.ui-container').hasClass ('on'))
				return;

			App.vent.trigger ('article:focus');

			if (!App.articleView || !App.articleView.model)
				return;

			var processed = false;

			switch (event.keyCode) {
			case 32:
				processed = true;
				break;

			case 37: // left arrow
			case 75: // k
				App.vent.trigger ('article:prev', App.articleView.model.id);
				processed = true;
				break;

			case 39: // right arrow
			case 74: // j
				App.vent.trigger ('article:next', App.articleView.model.id);
				processed = true;
				break;

			case 38: // up arrow
			case 40: // down arrow
				var scroller = $(App.articleView.options.scroller);
				var scrollTop = scroller.scrollTop ();
				var outerHeight = scroller.outerHeight ()
				var totalHeight = scroller.get(0).scrollHeight;
				if (event.keyCode == 38) {
					scroller.scrollTop (Math.max(0, scrollTop - 40));
				} else {
					scroller.scrollTop (Math.min(totalHeight-outerHeight, scrollTop + 40));
				}
				processed = true;
				break;

			case 33: // page up
			case 34: // page down
				var scroller = $(App.articleView.options.scroller);
				var scrollTop = scroller.scrollTop ();
				var outerHeight = scroller.outerHeight ()
				if (event.keyCode == 33) {
					if (scrollTop == 0) {
						App.vent.trigger ('article:prev', App.articleView.model.id);
					} else {
						scroller.animate({scrollTop: Math.max(0, scrollTop - (outerHeight-40))});
					}
				} else {
					// 如果已经滚动到下头，article:next
					var totalHeight = scroller.get(0).scrollHeight;
					if (scrollTop + outerHeight >= totalHeight) {
						App.vent.trigger ('article:next', App.articleView.model.id);
					} else {
						scroller.animate({scrollTop: Math.min(totalHeight-outerHeight, scrollTop + (outerHeight-40))});
					}
				}
				processed = true;
				break;

			case 77: // m, 标记为已读/未读
				if (App.articleView.model.isRead () || App.articleView.model.isMarkAsRead ()) {
					App.articleView.model.mark ('unread');
				} else {
					App.articleView.model.mark ('markasread');
				}
				processed = true;
				break;

			case 83: // s, 标星
				if (App.articleView.model.isStarred ()) {
					App.articleView.model.mark ('unstar');
				} else {
					App.articleView.model.mark ('star');
				}
				processed = true;
				break;

			case 86: // v, 查看原始内容
				window.open(App.articleView.model.get ('alternate').href);
				processed = true;
				break;

			case 13: // enter, 打开/关闭项目
				break;

			case 85: // u, 切换全屏模式
				break;
			}

			if (processed)
				event.preventDefault ();
		}
	});

	AppFeedPanel = Backbone.Marionette.Controller.extend ({
		initialize: function() {
			$('#feed-context-panel ul.context-menu').delegate ('li.context-menu-item', 'click', this.onMenuItem);
			$('#feed-context-panel ul.labels').delegate ('li.label', 'click', this.onLabelItem);

			$('#btnFeedPanelClose').click (this.onClose);

			$('#btnFeedPanelRename').click (this.onRename);

			$('#btnFeedPanelNewLabel').click (this.onNewLabel);

			$('#inputFeedNewLabel').focus (this.onNewLabelFocus);
			$('#inputFeedNewLabel').blur (this.onNewLabelBlur);

			$('#inputFeedRenameTitle').bindWithDelay ('blur', this.onRenameTitleBlur, 500);
		},

		onLabelItem: function (event) {
			if ($(event.currentTarget).hasClass ('disabled'))
				return;

			var curFeed = $('#feed-context-panel').attr ('data-id');
			var curLabel = $(event.currentTarget).attr ('data-id');

			var on = $(event.currentTarget).hasClass ('on');

			App.storage.subscriptionEdit (curFeed, 'edit', '', on ? '': curLabel, on ? curLabel : '');

			if (on)
				$(event.currentTarget).removeClass ('on');
			else
				$(event.currentTarget).addClass ('on');

			App.storage.rebuildLabels ();
		},

		onMenuItem: function (event) {
			if ($(event.currentTarget).hasClass ('disabled'))
				return;

			if ($(event.currentTarget).hasClass ('rename')) {
				var oldTitle = $('#feed-context-panel .feed-title').text ();

				$('#inputFeedRenameTitle').parent ().css ('display', 'block');
				$('#inputFeedRenameTitle').focus ();
				$('#inputFeedRenameTitle').val (oldTitle);

				$('#feed-context-panel .context-menu-item.rename').css ('display', 'none');
			} else if ($(event.currentTarget).hasClass ('unsubscribe')) {
				$('#feed-context-panel').removeClass ('on');

				var curFeed = $('#feed-context-panel').attr ('data-id');
				var feed = App.storage.getFeed (curFeed);

				var title = 'Unsubscribe';
				var message = 'Are you sure you\'d like to unsubscribe from <b>"' + feed.get ('title') + '"</b>?';
				App.alertDialog.show (title, message, function (ret) {
					if (ret > 0)
						App.storage.subscriptionEdit (feed.get ('id'), 'unsubscribe');
					$('.ui-container').delay(500).removeClass ('on');
				});
			} else if ($(event.currentTarget).hasClass ('markasread')) {
				$('#feed-context-panel').removeClass ('on');

				var curFeed = $('#feed-context-panel').attr ('data-id');
				var feed = App.storage.getFeed (curFeed);

				if (feed.get ('unread_count') < 50) {
					App.storage.mark (feed, 'markasread');
					$('.ui-container').delay(500).removeClass ('on');
					return;
				}

				var title = 'Mark all as Read';
				var message = 'Are you sure you want to mark <b>' + feed.get ('unread_count') + '</b> items from <b>"' + feed.get ('title') + '"</b> as read?"';
				App.alertDialog.show (title, message, function (ret) {
					if (ret > 0)
						App.storage.mark (feed, 'markasread');
					$('.ui-container').delay(500).removeClass ('on');
				});
			}
		},

		onClose: function (event) {
			$('#feed-context-panel').removeClass ('on');
			$('.ui-container').delay (500).removeClass ('on');
		},

		onRename: function (event) {
			var newTitle = $('#inputFeedRenameTitle').val ();
			var oldTitle = $('#feed-context-panel .feed-title').text ();
			if (!newTitle || newTitle == oldTitle)
				return;

			var curFeed = $('#feed-context-panel').attr ('data-id');

			App.storage.subscriptionEdit (curFeed, 'edit', newTitle, '', '');

			$('#feed-context-panel').removeClass ('on');
			$('.ui-container').delay(500).removeClass ('on');

			//this.onClose ();
		},

		onNewLabel: function (event) {
			var newLabel = $('#inputFeedNewLabel').val ();
			if (!newLabel)
				return;

			var curFeed = $('#feed-context-panel').attr ('data-id');

			App.storage.subscriptionEdit (curFeed, 'edit', '', newLabel, '');
			App.storage.rebuildLabels ();

			$('#feed-context-panel').removeClass ('on');
			$('.ui-container').delay(500).removeClass ('on');

			//this.onClose ();
		},

		onNewLabelFocus: function (event) {
			$('#inputFeedNewLabel').parent ().addClass ('focus');
		},
		onNewLabelBlur: function (event) {
			$('#inputFeedNewLabel').parent ().removeClass ('focus');
		},

		onRenameTitleBlur: function (event) {
			$('#feed-context-panel .context-menu-item.rename').css ('display', 'block');

			$('#inputFeedRenameTitle').parent ().css ('display', 'none');
		}
	});

	AppLabelPanel = Backbone.Marionette.Controller.extend ({
		initialize: function() {
			$('#label-context-panel ul.context-menu').delegate ('li.context-menu-item', 'click', this.onMenuItem);

			$('#btnLabelPanelClose').click (this.onClose);

			$('#btnLabelPanelRename').click (this.onRename);

			$('#inputLabelRenameTitle').bindWithDelay ('blur', this.onRenameTitleBlur, 500);
		},

		onMenuItem: function (event) {
			if ($(event.currentTarget).hasClass ('disabled'))
				return;

			if ($(event.currentTarget).hasClass ('rename')) {
				var oldTitle = $('#label-context-panel .label-title').text ();

				$('#inputLabelRenameTitle').parent ().css ('display', 'block');
				$('#inputLabelRenameTitle').focus ();
				$('#inputLabelRenameTitle').val (oldTitle);

				$('#label-context-panel .context-menu-item.rename').css ('display', 'none');
			} else if ($(event.currentTarget).hasClass ('delete')) {
				$('#label-context-panel').removeClass ('on');

				var curLabel = $('#label-context-panel').attr ('data-id');
				var label = App.storage.getLabel (curLabel);

				var title = 'Delete';
				var message = 'Are you sure you\'d like to delete your <b>"' + label.get ('title') + '"</b> folder?';
				App.alertDialog.show (title, message, function (ret) {
					if (ret > 0)
						App.storage.labelRemove (label.get ('id'));
					$('.ui-container').delay(500).removeClass ('on');
				});
			} else if ($(event.currentTarget).hasClass ('unsubscribe')) {
				$('#label-context-panel').removeClass ('on');

				var curLabel = $('#label-context-panel').attr ('data-id');
				var label = App.storage.getLabel (curLabel);

				var title = 'Unsubscribe from All';
				var message = 'Are you sure you\'d like to unsubscribe from these feeds?';
				App.alertDialog.show (title, message, function (ret) {
					if (ret > 0)
						App.storage.labelEmpty (label.get ('id'));
					$('.ui-container').delay(500).removeClass ('on');
				});
			} else if ($(event.currentTarget).hasClass ('markasread')) {
				$('#label-context-panel').removeClass ('on');

				var curLabel = $('#label-context-panel').attr ('data-id');
				var label = App.storage.getLabel (curLabel);

				if (label.get ('unread_count') < 50) {
					App.storage.mark (label, 'markasread');
					$('.ui-container').delay(500).removeClass ('on');
					return;
				}

				var title = 'Mark all as Read';
				var message = 'Are you sure you want to mark <b>' + label.get ('unread_count') + '</b> items from <b>"' + label.get ('title') + '"</b> as read?"';
				App.alertDialog.show (title, message, function (ret) {
					if (ret > 0)
						App.storage.mark (label, 'markasread');
					$('.ui-container').delay(500).removeClass ('on');
				});
			}
		},

		onClose: function (event) {
			$('#label-context-panel').removeClass ('on');
			$('.ui-container').delay(500).removeClass ('on');
		},

		onRename: function (event) {
			var newTitle = $('#inputLabelRenameTitle').val ();
			var oldTitle = $('#label-context-panel .label-title').text ();
			if (!newTitle || newTitle == oldTitle)
				return;

			var curLabel = $('#label-context-panel').attr ('data-id');
			App.storage.labelRename (curLabel, newTitle);

			$('#label-context-panel').removeClass ('on');
			$('.ui-container').delay(500).removeClass ('on');
		},

		onRenameTitleBlur: function (event) {
			$('#label-context-panel .context-menu-item.rename').css ('display', 'block');

			$('#inputLabelRenameTitle').parent ().css ('display', 'none');
		}
	});

	AppSubscribePanel = Backbone.Marionette.Controller.extend ({
		initialize: function() {
			$('#btnSubscribePanelClose').click (this.onClose);

			$('#btnSubscribePanelSubscribe').click (this.onSubscribe);
		},

		onClose: function (event) {
			$('#subscribe-panel').removeClass ('on');
			$('.ui-container').delay(500).removeClass ('on');
		},

		onSubscribe: function (event) {
			var newFeed = $('#inputNewFeed').val ();
			if (!newFeed) {
				// 提示信息
				return;
			}

			App.storage.subscriptionQuickAdd (newFeed, function (data) {
				if (!data) {
					// 订阅失败，显示错误信息
				} else {
					// 订阅成功，重新加载
					App.storage.subscriptionList ();
				}
				$('#subscribe-panel').removeClass ('on');
				$('.ui-container').delay(500).removeClass ('on');
			});
		}
	});

	AppAlertDialog = Backbone.Marionette.Controller.extend ({
		initialize: function() {
			$('#alert-dialog .btn.ok').on ('click', null, this, this.onOK);
			$('#alert-dialog .btn.cancel').on ('click', null, this, this.onCancel);
		},

		show: function (title, message, callback) {
			$('#alert-dialog .title').html (title);
			$('#alert-dialog .message').html (message);

			$('#alert-dialog').addClass ('on');

			this.callback = callback;
		},

		onOK: function (event) {
			$('#alert-dialog').removeClass ('on');

			if (event.data && event.data.callback)
				event.data.callback (1);
		},

		onCancel: function (event) {
			$('#alert-dialog').removeClass ('on');

			if (event.data && event.data.callback)
				event.data.callback (0);
		}
	});

	App = new Backbone.Marionette.Application ();

	// 事件处理
	App.addInitializer (function(options) {
		App.vent.on ('article:close', function () {
			App.router.back();
		});

		App.vent.on ('article:focus', function () {
			$('#feed-context-panel').removeClass ('on');
			$('#label-context-panel').removeClass ('on');
			$('.ui-container').delay(500).removeClass ('on');

			$('.wrapper1').removeClass ('on');
			$('.side-actions').removeClass ('on');

			$('.wrapper2').removeClass ('on');
		});

		App.vent.on ('article:prev', function (id) {
			if (!App.indexList)
				return;

			var prevArticle = App.indexList.getPrev (id);
			if (prevArticle) {
				var url = '#item/' + prevArticle.get ('id');
				App.router.navigate (url, {trigger: true, replace: true});
			}
		});

		App.vent.on ('article:next', function (id) {
			if (!App.indexList)
				return;

			var nextArticle = App.indexList.getNext (id);
			if (nextArticle) {
				var url = '#item/' + nextArticle.get ('id');
				App.router.navigate (url, {trigger: true, replace: true});
			}
		});

		App.vent.on ('article:change', function (id) {
			if (App.articleView && App.articleView.model && App.articleView.model.id == id)
				return;

			var that = this;

			// 如果延迟定时期存在，说明还没到时，markasread，清除定时期
			if (that.mark_timer) {
				clearTimeout (that.mark_timer);
				that.mark_timer = null;

				App.articleView && App.articleView.model && App.articleView.model.mark ('markasread');
			}

			var newArticle = App.storage.getItem (id);
			if (!newArticle)
				return;

			if (App.articleView) {
				// 先删除旧的View
				// XXX 需要把 #article-view 节点重新创建，应该有更简单的方法
				var oldClass = App.articleView.$el.attr ('class');

				var articleViewContainer = App.articleView.$el.parent ();
				App.articleView.close ();

				articleViewContainer.html ('<div id="article-view" class="' + oldClass + '"></div>');
			}

			App.articleView = new ArticleView ({el: '#article-view', model: newArticle, 'scroller': '.app-view section.wrapper3'})
			App.articleView.render ();

			$(App.articleView.options.scroller).scrollTop (0);

			// 延迟 5 秒，设置为 read
			// 可配置参数
			that.mark_timer = setTimeout (function () {
				that.mark_timer = null;

				newArticle && newArticle.mark ('read');
			}, 5000);

			App.indexList.trigger ('article:current-change', id);

			// 修改标题
			document.title = newArticle.get ('title');
		});

		App.vent.on ('feed-panel:close', function () {
			var panel = $('#feed-context-panel');

			panel.removeClass ('on');

			App.vent.trigger ('article:focus');
		});

		App.vent.on ('feed-panel:open', function (model) {
			var panel = $('#feed-context-panel');

			panel.find ('.feed-title').html (model.get ('title'));
			panel.attr ('data-id', model.id);

			var labels = App.storage.getLabels ();
			var labels_container = panel.find ('ul.labels');

			var compiledTemplate = _.template('<li class="label <@=on@>" data-id="<@=id@>"><i class="icon icon-ok-circle"></i><span class="title"><@=title@></span></li>');

			var str = "";
			for (var i = 0; i < labels.length; i ++) {
				var label = labels.at (i);
				if (label.id == '***ALL***' || label.id == '***OTHERS***' || label.id == '***MUTES***')
					continue;

				var on = model.get('categories') && (model.get('categories').indexOf (label.id) >= 0);

				var item = {'title': label.get ('title'), 'id': label.id, 'on': on ? 'on' : ''};

				str += compiledTemplate (item);
			}
			labels_container.html (str);

			$('#inputNewLabel').val ('');

			$('.ui-container').addClass ('on');
			panel.delay(500).addClass ('on');
		});

		App.vent.on ('label-panel:close', function () {
			var panel = $('#label-context-panel');

			panel.removeClass ('on');

			App.vent.trigger ('article:focus');
		});

		App.vent.on ('label-panel:open', function (model) {
			var panel = $('#label-context-panel');

			// 初始化数据
			panel.find ('.label-title').html (model.get ('title'));
			panel.attr ('data-id', model.id);

			panel.find ('.context-menu-item').removeClass ('disabled');

			if (model.id == '***ALL***') {
				panel.find ('.rename').addClass ('disabled');
				panel.find ('.delete').addClass ('disabled');
				panel.find ('.unsubscribe-all').addClass ('disabled');
			}
			if (model.id == '***MUTES***') {
				panel.find ('.markasread').addClass ('disabled');
				panel.find ('.rename').addClass ('disabled');
				panel.find ('.delete').addClass ('disabled');
			}
			if (model.id == '***OTHERS***') {
				panel.find ('.rename').addClass ('disabled');
				panel.find ('.delete').addClass ('disabled');
			}

			$('.ui-container').addClass ('on');
			panel.delay(500).addClass ('on');
		});

		App.vent.on ('subscribe-panel:close', function () {
			var panel = $('#subscribe-panel');

			panel.removeClass ('on');

			App.vent.trigger ('article:focus');
		});

		App.vent.on ('subscribe-panel:open', function (model) {
			var panel = $('#subscribe-panel');

			$('.ui-container').addClass ('on');
			panel.delay(500).addClass ('on');
		});

		App.vent.on ('stream:reset', function (url) {
			App.indexList.url = url || App.indexList.url;
			App.indexList.continuation = null;
			App.indexList.reset ();

			App.indexView.scrollTop (0);

			// 加载数据
			App.indexList.getMore (function () {
				if (App.indexList.length > 0) {
					App.vent.trigger ('article:change', App.indexList.at (0).id);
				}
			});

			App.labelsView.setCurrent (App.indexList.url);
		});

		App.vent.on ('filter:all', function () {
			App.indexView.setStreamFilter ('state/reading-list');

			App.storage.setStreamFilter ('state/reading-list');

			App.vent.trigger ('stream:reset');
		});

		App.vent.on ('filter:unread', function () {
			App.indexView.setStreamFilter ('state/unread');

			App.storage.setStreamFilter ('state/unread');

			App.vent.trigger ('stream:reset');
		});

		App.vent.on ('filter:starred', function () {
			App.indexView.setStreamFilter ('state/starred');

			App.storage.setStreamFilter ('state/starred');

			App.vent.trigger ('stream:reset');
		});
	});

	// 初始化基本对象
	App.addInitializer (function(options) {
		App.router = new AppRouter ();
		App.storage = new AppStorage ();

		App.keyboard = new AppKeyboard ();
		App.screen = new AppScreen ();

		App.feedPanel = new AppFeedPanel ();
		App.labelPanel = new AppLabelPanel ();
		App.subscribePanel = new AppSubscribePanel ();

		App.alertDialog = new AppAlertDialog ();

		// 根据设备类型，初始化一些手势处理
		if (App.screen.mobile) {
			$('.app-view .wrapper1').swipeleft (function (event) {
				event.preventDefault ();

				$('.wrapper1').removeClass ('on');
				$('.side-actions').removeClass ('on');
			});
			$('.app-view .wrapper2').swipeleft (function (event) {
				event.preventDefault ();

				$('.wrapper2').removeClass ('on');
			});
			$('.app-view .wrapper2').swiperight (function (event) {
				event.preventDefault ();

				$('.wrapper1').addClass ('on');
				$('.side-actions').addClass ('on');
			});

			$('.app-view .wrapper3').swipeleft (function (event) {
				event.preventDefault ();

				if (!App.articleView || !App.articleView.model)
					return;

				App.vent.trigger ('article:next', App.articleView.model.id);
			});
			$('.app-view .wrapper3').swiperight (function (event) {
				event.preventDefault ();

				if (!App.articleView || !App.articleView.model)
					return;

				App.vent.trigger ('article:prev', App.articleView.model.id);
			});
		}

		// 延迟让 ui-container 可见，避免加载时影响显示
		$('div.ui-container').delay(2000).css ('display', 'block');
	});

	// 数据加载处理
	App.addInitializer (function(options) {
		var streamId = App.storage.getStreamId ();
		var streamFilter = App.storage.getStreamFilter ();
		if (streamFilter != 'state/unread')
			streamFilter = 'state/reading-list';

		if (location.hash.indexOf ('#stream/state') >= 0 || location.hash.indexOf ('#stream/label') >= 0 || location.hash.indexOf ('#stream/feed') >= 0) {
			streamId = decodeURIComponent (location.hash.substring ('#stream/'.length));
		}

		App.labelsView = new LabelsView ({el: '#label-view', collection: App.storage.getLabels ()});
		App.labelsView.render ();

		App.indexList = new ArticleList ([], {url: "stream/" + encodeURIComponent (streamId), page_size: 20, continuation: ''});

		App.indexView = new IndexListView ({el:"#index-view", itemView: IndexItemView, collection: App.indexList, 'scroller': '.app-view aside.wrapper2'});
		App.indexView.render ();

		App.storage.setStreamFilter (streamFilter);
		App.indexView.setStreamFilter (streamFilter);

		App.vent.trigger ('stream:reset');

		Backbone.history.start();

		if (location.hash != '#stream/' + encodeURIComponent (streamId))
			App.router.navigate ('#stream/' + encodeURIComponent (streamId), {trigger: true, replace: true})
	});

	// DOM 事件处理代码，需要整理
	App.addInitializer (function(options) {
		$('#filter-all').click (function (event) {
			event.preventDefault ();

			App.vent.trigger ('filter:all');
		});

		$('#filter-unread').click (function (event) {
			event.preventDefault ();

			App.vent.trigger ('filter:unread');
		});

		$('#filter-starred').click (function (event) {
			event.preventDefault ();

			App.vent.trigger ('filter:starred');
		});

		$('#btnSettings').click (function (event) {
			event.preventDefault ();

			window.location = "/reader/settings/";
		});

		$('#btnSubscribe').click (function (event) {
			event.preventDefault ();

			App.vent.trigger ('subscribe-panel:open');
		});

		$('#btnPrev').click (function (event) {
			event.preventDefault ();

			if (!App.articleView || !App.articleView.model)
				return;

			App.vent.trigger ('article:prev', App.articleView.model.id);
		});

		$('#btnNext').click (function (event) {
			event.preventDefault ();

			if (!App.articleView || !App.articleView.model)
				return;

			App.vent.trigger ('article:next', App.articleView.model.id);
		});

		$('#btnStar').click (function (event) {
			event.preventDefault ();

			if (!App.articleView || !App.articleView.model)
				return;

			if (App.articleView.model.isStarred ()) {
				App.articleView.model.mark ('unstar');
			} else {
				App.articleView.model.mark ('star');
			}
		});

		$('#btnCheck').click (function (event) {
			event.preventDefault ();

			if (!App.articleView || !App.articleView.model)
				return;

			if (App.articleView.model.isRead () || App.articleView.model.isMarkAsRead ()) {
				App.articleView.model.mark ('unread');
			} else {
				App.articleView.model.mark ('read');
			}
		});

		$('#btnMenu1').click (function (event) {
			//event.preventDefault ();
			event.stopPropagation ();

			if ($('.wrapper1').hasClass ('on')) {
				$('.wrapper1').removeClass ('on');
				$('.side-actions').removeClass ('on');
			} else {
				$('.wrapper1').addClass ('on');
				$('.side-actions').addClass ('on');
			}
		});

		$('#btnMenu2').click (function (event) {
			event.stopPropagation ();

			if ($('.wrapper2').hasClass ('on')) {
				$('.wrapper2').removeClass ('on');
			} else {
				$('.wrapper2').addClass ('on');
			}
		});

		$('#btnMarkAllAsRead').click (function (event) {
			event.stopPropagation ();

			var url = decodeURIComponent (App.indexList.url);
			if (url.indexOf ('stream/') != 0) {
				// 错误：
				return;
			}

			// 获得 当前 feed 或 label
			var streamId = url.substring ('stream/'.length);

			var obj = null;
			if (streamId.indexOf ('feed/') == 0) {
				obj = App.storage.getFeed (streamId);
			} else if (streamId == 'label/') {
				obj = App.storage.getLabel ('***OTHERS***');
			} else if (streamId.indexOf ('label/') == 0) {
				obj = App.storage.getLabel (streamId.substring ('label/'.length));
			} else if (streamId == 'state/reading-list') {
				obj = null;
			} else if (streamId == 'state/mutes') {
				// 错误：
				return;
			} else {
				// 错误：
				return;
			}

			if (obj && obj.get ('unread_count') < 50) {
				App.storage.mark (obj, 'markasread');
				return;
			}

			$('.ui-container').addClass ('on');

			var title = 'Mark all as Read';
			var message = 'Are you sure you want to mark all as read?';
			if (obj != null)
				message = 'Are you sure you want to mark <b>' + obj.get ('unread_count') + '</b> items from <b>"' + obj.get ('title') + '"</b> as read?"';
			App.alertDialog.show (title, message, function (ret) {
				if (ret > 0)
					App.storage.mark (obj, 'markasread');
				$('.ui-container').delay(500).removeClass ('on');
			});
		});

		$('#btnRefresh').click (function (event) {
			location.reload ();
		});

		$('div.ui-container div.blur-overlay').click (function (event) {
			$('div.ui-container').find('.ui').removeClass ('on');

			$('div.ui-container').delay(500).removeClass ('on');
		});

		$('.wrapper3').click (function (event) {
			App.vent.trigger ('article:focus');
		});
	});

	App.start ();

});
