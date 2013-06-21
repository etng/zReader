jQuery ->
    _.mixin
        diff: (a,b)->
            removed: _.difference b, a
            added: _.difference a, b
        truncate:(s, limit)->
            if !limit or limit<=0
                limit = 280
            l = s.length
            if l>limit/2
                m=0
                n=0
                while m<l && n<limit
                    m++
                    c = s.charCodeAt m
                    n++
                    #双字节按2个长度计算
                    if c>256 or c<0
                        n++
                if m<l
                    return s.substring(0, m)+"..."
             s
        prettyDate:(time)->
            seconds = (new Date().getTime() - new Date(time).getTime())/1000
            days = Math.floor seconds/86400
            return if isNaN(days) or days<0
            if days == 0
                if seconds < 60
                    return "moments ago"
                else if seconds<3600
                    return "#{Math.floor(seconds/60)} minutes ago"
                else
                    return "#{Math.floor(seconds/3600)} hours ago"
            else if days == 1
                return "Yesterday"
            else if days<7
                return "#{days} days ago"
            else if days<31
                return "#{Math.ceil(days/7)} weeks ago"
            else if days<365
                return "#{Math.ceil(days/30.5)} months ago"
            else
                return "#{Math.ceil(days/365)} years ago"
    _.templateSettings =
            interpolate: /\<\@\=(.+?)\@\>/gim
            evaluate: /\<\@(.+?)\@\>/gim
            escape: /\<\@\-(.+?)\@\>/gim
    _.extend Backbone.Model.prototype,
        mergeDelta: (delta)->
            for field, count of delta
                if @has field
                    @set field, @get(field) + count
            @

    Feed = Backbone.Model.extend
        defaults:->
            defaults =
                title: ''
                mute: false
            for field, label of App.stat_fields
                defaults.field = 0
            defaults
        initialize: ->
            @on 'change', =>
                delta = {}
                for field, label of App.stat_fields
                    delta[field] = @get(field) - @previous(field)
                App.storage.allLabel.mergeDelta delta
                if model.mute
                    Appl.storage.mutesLabel.mergeDelta delta
                if model.get('categories') && model.get('categories').length
                    _.each model.get('categories'), (category)->
                        App.storage.labels.get(category).mergeDelta delta
                        return
                else
                    App.storage.othersLabel.mergeDelta delta
        removeLabel:(label)->
            if App.storage.labels.get(label).isLocked()
                return
            $.ajax
                url: "/reader/api/0/disable-tag?ck=#{$.now()}"
                type: 'POST'
                data:
                    "s": label
            .done (data)=>
                categories = @get 'categories'
                categories.splice categories.indexOf(label), 1
                @set 'categories'
                return
        markasread:->
            App.storage.mark @, 'markasread'
            return
        getSortRank:->
            rank_weight =
                markasread: -1
                read: 2
                starred: 5
            rank = 0
            for field, weight of rank_weight
                rank += @get(field) * weight
            rank
    Label = Backbone.Model.extend
        default:->
        lock:->
            @locked = true
        isLocked:->
            @locked
        unsubscribe:->
            # unsubscribe from all the feeds under this label
            # only when the label is category
            if @locked
                throw "can not unsubscribe here"
            $.ajax
                url: "/reader/api/0/empty-tag?ck=#{$.now()}"
                type: 'POST'
                data:
                    "s": @title
                done:(data)=>
                    for feed in @get 'feeds'
                        App.storage.feeds.remove feed

        rename:(new_name)->
            old_name = @get 'title'
            $.ajax
                url: "/reader/api/0/rename-tag?ck=#{$.now()}"
                type: 'POST'
                data:
                    "s": old_name
                    "dest": new_name
            .done (data)=>
                @set 'title', new_name
                @get('feeds').forEach (feed)->
                    categories = feed.get 'categories'
                    if _.contains categories, old_name
                        categories[categories.indexOf(old_name)]=new_name
                    return
        addFeed:(feed)->
            delta = _.pick.apply _, [feed.attributes].concat(_.keys(App.stat_fields))
            @get('feeds').add feed
            @mergeDelta delta
            @
        getSortRank:->
            rank_weight =
                markasread: -1
                read: 2
                starred: 5
            rank = 0
            for field, weight of rank_weight
                rank += @get(field) * weight
            rank
    Article = Backbone.Model.extend
        state_read: 'state/read'
        state_markasread: 'state/markasread'
        state_starred: 'state/starred'
        getFeed:->
            new Feed()
        setState:(state)->
            switch state
                when 'read'
                    unless @isRead()
                        categories = _.clone @get 'categories'
                        categories.push @state_read
                        @set {categories}
                        @getFeed().increment 'read'
                when 'markasread'
                    unless @isMarkAsRead()
                        categories = _.clone @get 'categories'
                        categories.push @state_markasread
                        @set {categories}
                        @getFeed().increment 'markasread'
                when 'unread'
                    if @isMarkAsRead() or @isRead()
                        categories = _.clone @get 'categories'
                        if @isMarkAsRead()
                            categories.splice categories.indexOf(@state_markasread), 1
                        if @isRead()
                            categories.splice categories.indexOf(@state_read), 1
                        @set {categories}
                        @getFeed().increment 'markasread'
                when 'star'
                    unless @isStarred()
                        categories = _.clone @get 'categories'
                        categories.push @state_starred
                        @set {categories}
                        @getFeed().increment 'starred'
                when 'unstar'
                    if @isStarred()
                        categories = _.clone @get 'categories'
                        categories.splice categories.indexOf(@state_starred), 1
                        @set {categories}
                        @getFeed().increment 'markasread'
                else
                    console.log state
            #get feeds
            $.ajax
                url: "/reader/api/0/subscription/list?ck=#{$.now()}"
                type: 'POST'
            #mark all as read
            if obj instanceof Feed
                $.ajax
                    url: "/reader/api/0/mark-all-as-read?ck=#{$.now()}"
                    type: 'POST'
                    data:
                        "s": "state/reading-list"
        toggle:(state, is_true)->
            delta = {}
            notify_data=
                i: @id
            category = "state/#{state}"
            categories = _.clone @get 'categories'
            has_it = _.contains @get('categories'), category
            if typeof(is_true)=='undefined'
               is_true =!has_it
            if is_true
                unless has_it
                    delta[state]= 1
                    categories.push category
                    notify_data.a = category
            else
                if has_it
                    delta[state] = -1
                    categories.splice categories.indexOf(category), 1
                    notify_data.r = category
            unless _.isEmpty delta
                @set {categories}
                @getFeed().mergeDelta delta
                $.ajax
                    url: "/reader/api/0/edit-tag?ck=#{$.now()}"
                    type: 'POST'
                    data: notify_data
            true
        is:(state)->
            category = "state/#{state}"
            _.contains @get('categories'), category
        isRead:->
            _.contains @get('categories'), @state_read
        isMarkAsRead:->
            _.contains @get('categories'), @state_markasread
        isStarred:->
            _.contains @get('categories'), @state_starred
        getItemClass:->
            klasses=[]
            klasses.push 'read' if @isRead()
            klasses.push 'starred' if @isStarred()
            klasses.push 'markasread' if @isMarkAsRead()
            klasses.join ' '
    ArticleList = Backbone.Collection.extend
        model: Article
        initialize: (items, options)->
            @page_size = options.page_size
            @continuation = options.continuation
            @stream = options.stream
            @loading = false
            @on 'article:current-change', (id)=>
                @currentId = id
                return
        getNext:(id)->
            index = -1
            @forEach (article,i)->
                if article.get('id')==id
                    index = i+1
                    return false
                return
            return null if index<0
            if index==@length-1
                @loadMore()
            @at index

        getPrev:(id)->
            index = -1
            @forEach (article,i)->
                if article.get('id')==id
                    index = i-1
                    return false
                return
            return null if index<0
            @at index
        loadMore:(onload)->
            @loading = true
            App.storage.getItemsRemote @, ->
                @loading = false
                onload && onload()
                return
        isLoading:->
            @loading
    LabelList = Backbone.Collection.extend
        model: Label
        initialize:->
        comparator: (a, b)->
            #all on the top
            return -1 if a.id==App.all_label_id
            return 1 if b.id==App.all_label_id
            #mutes on the bottom
            return 1 if a.id==App.mutes_label_id
            return -1 if b.id==App.mutes_label_id
            #unreaded on the top
            return 1 if a.get('unread')==0 and b.get('unread')>0
            return -1 if a.get('unread')>0 and b.get('unread')==0
            rank_a = a.getSortRank()
            rank_b = b.getSortRank()
            return 1 if rank_a<rank_b
            return -1 if rank_a>rank_b
            if a.get('title')==b.get('title')
                return 0
            else if a.get('title')>b.get('title')
                return 1
            else
                return -1
    FeedList = Backbone.Collection.extend
        model: Feed
        initialize:->
        comparator:(a, b)->
            # is it is muted, then go to last
            return 1 if a.get('mute') && !b.get('mute')
            return -1 if !a.get('mute') && b.get('mute')
            # if unread count is zero, then go to last
            return 1 if a.get('unread')==0 and b.get('unread')>0
            return -1 if a.get('unread')>0 and b.get('unread')==0
            # the low the rank, the last the positon
            rank_a = a.getSortRank()
            rank_b = b.getSortRank()
            return 1 if rank_a<rank_b
            return -1 if rank_a>rank_b

            if a.get('title')==b.get('title')
                return 0
            else if a.get('title')>b.get('title')
                return 1
            else
                return -1
    IndexItemView = Backbone.Marionette.ItemView.extend
        template : '#index-item-template',
        attributes : ()->
            'class' : 'index-item' + this.model.getItemClass()
        templateHelpers:
            prettyDate: (time)->
                _.prettyDate time
            getSummaryText: (limit)->
                _.truncate @summaryText,limit
        events:
            'click': 'clicked'

        clicked: (event)->
            if $(event.target).hasClass('star')
                event.stopPropagation()

                if(this.$el.hasClass('starred'))
                    this.model.mark('unstar')
                 else
                    this.model.mark('star')

            else if $(event.target).hasClass('check')
                event.stopPropagation()
                if this.$el.hasClass('read') || this.$el.hasClass('markasread')
                    this.model.mark('unread')
                 else
                    this.model.mark('markasread')

             else
                event.preventDefault()
                App.router.navigate('#item/' + this.model.get('id'), {trigger: true, replace:(window.location.hash.indexOf('#item/') == 0)})
                $('.wrapper2').removeClass('on')
        modelEvents:
            'change': 'changed'

        changed: ()->
            newCategories = this.model.get('categories')
            oldCategories = this.model.previous('categories')
            if(newCategories.indexOf('state/starred') >= 0 && oldCategories.indexOf('state/starred') < 0)
                this.$el.addClass('starred')
            if(newCategories.indexOf('state/starred') < 0 && oldCategories.indexOf('state/starred') >= 0)
                this.$el.removeClass('starred')
            if(newCategories.indexOf('state/read') >= 0 && oldCategories.indexOf('state/read') < 0)
                this.$el.addClass('read')
            if(newCategories.indexOf('state/read') < 0 && oldCategories.indexOf('state/read') >= 0)
                this.$el.removeClass('read')
            if(newCategories.indexOf('state/markasread') >= 0 && oldCategories.indexOf('state/markasread') < 0)
                this.$el.addClass('markasread')
            if(newCategories.indexOf('state/markasread') < 0 && oldCategories.indexOf('state/markasread') >= 0)
                this.$el.removeClass('markasread')


    IndexListView = Backbone.Marionette.CollectionView.extend
        initialize : ()->
            @loading = false
            scroller = @$el.parent()
            @collection.on 'article:current-change', (id)=>
                return unless id
                itemId = id

                item = @$el.find '.index-item article[data-id=' + itemId + ']'
                return unless item
                item = item.parent()
                return unless item

                scroller = @$el.parent()
                return unless scroller
                scrollTop = scroller.scrollTop()
                outerHeight = scroller.outerHeight()
                return unless outerHeight>0

                return unless item.offset()

                @$el.find('.index-item.current').removeClass('current')
                item.addClass('current')

                itemTop = scrollTop + item.offset().top
                itemHeight = item.height()
                if(itemTop >= scrollTop+scroller.offset().top && itemTop + itemHeight <= scrollTop+scroller.offset().top + outerHeight)
                    return

                totalHeight = scroller.get(0).scrollHeight
                cy = itemTop + (itemHeight/2)
                sy = parseInt(cy - outerHeight/3 - scroller.offset().top)

                sy = Math.max(0, Math.min(sy, totalHeight-outerHeight))

                scroller.animate {scrollTop: sy}
            #
            scroller.bindWithDelay "scroll", (event)=>
                return if @collection.isLoading()

                outerHeight = scroller.outerHeight()
                totalHeight = scroller.get(0).scrollHeight
                scrollTop = scroller.scrollTop()

                if(totalHeight -(scrollTop + outerHeight) < outerHeight)
                    # 显示一个等待信息
                    @collection.getMore ()->
                        # 关闭等待信息
                        return
            , 100

            # 加入延迟绑定事件，用于处理自动标记为已读
            # 当前位置之上的都标记为已读
            scroller && scroller.bindWithDelay "scroll", (event)->
                console.log 'scroll delay'
                return
            , 1000
            return

        setStreamFilter: (name)->
            $('.filter').removeClass 'active'
            klass = name.split('/')[1]
            if klass=='reading-list'
                klass = 'all'
            $('.filter.'+klass).addClass 'active'
            return

        scrollTop: (n)->
            scroller = @$el.parent()
            scroller.scrollTop n


    FeedView = Backbone.Marionette.ItemView.extend
        template : '#feed-item-template'
        tagName: 'li'
        attributes : ()->
            'class' : 'feed-item',
            'data-id': "stream/#{encodeURIComponent(@model.id)}"
        ui:
            'counter': 'span.title>span.counter'
            'title': 'span.title>span.txt'
            'more': 'i.more'
            'mute': 'i.mute'
        templateHelpers:
            getCount:  (name)-> # unread, all, starred
                count = @[name]
                count = 0 unless count
                if count>1000 then '1000+' else "#{count}"
            getStreamId: ()->
                "stream/#{encodeURIComponent(@id)}"
            getMuteClass: ()->
                if @mute then 'on' else ''
        events:
            'click': 'clicked'
        clicked: (event)->
            if $(event.target).hasClass 'more'  # 打开
                event.stopPropagation()
                feedPanel = $('#feed-context-panel')
                if feedPanel.hasClass 'on'
                    # 关闭 feed-panel
                    App.vent.trigger 'feed-panel:close'
                 else
                    # 打开 feed-panel
                    App.vent.trigger 'feed-panel:open', @model
             else if $(event.target).hasClass 'mute' # 静音切换
                event.stopPropagation()
                App.storage.subscriptionEdit @model.id, if $(event.target).hasClass('on') then  'unmute' else 'mute'
             else  # 标题点击，切换内容
                event.stopPropagation()
                url = '#' + @templateHelpers.getStreamId.apply(@model.attributes)
                if window.location.hash == url
                    App.vent.trigger 'stream:reset', url.substring('#'.length)
                else
                    App.router.navigate url, {trigger: true}
                App.vent.trigger 'article:focus'
                return
        modelEvents:
            'change': 'changed'
        changed: ()->
            count = @templateHelpers.getCount.apply @model.attributes, ['unread']
            @ui.counter.html "(#{counter})"
            @ui.counter.toggleClass 'on', count=='0'
            @ui.title.html @model.get 'title'
            @ui.mute.toggleClass 'on', @model.get('mute')
            return

    LabelView = Backbone.Marionette.CompositeView.extend
        itemView: FeedView
        itemViewContainer: 'ul.feed-items'
        template : '#label-item-template'
        tagName: 'div'
        className: 'label-item'
        ui:
            'counter': 'span.title>span.counter'
            'arrow': 'i.arrow'
            'more': 'i.more'
        templateHelpers:
            getCount:  (name)-> # unread, all, starred
                count = @[name]
                count = 0 unless count
                if count>1000 then '1000+' else "#{count}"
            getStreamId: ()->
                switch @id
                    when '***ALL***'
                        return 'stream/' + encodeURIComponent  'state/reading-list'
                    when '***MUTES***'
                        return 'stream/' + encodeURIComponent  'state/mute'
                    when '***OTHERS***'
                        return 'stream/' + encodeURIComponent 'label/'
                    else
                        return 'stream/' + encodeURIComponent "label/#{@id}"
        initialize: ()->
            this.collection = this.model.get 'feeds'
            return
        events:
            'click': 'clicked'
        clicked: (event)->
            if $(event.target).hasClass 'more'  # label-panel
                event.stopPropagation()
                labelPanel = $('#label-context-panel')
                if labelPanel.hasClass 'on'
                    App.vent.trigger 'label-panel:close'
                 else
                    App.vent.trigger 'label-panel:open', this.model
            else if $(event.target).hasClass 'arrow' # 展开/关闭
                event.stopPropagation()
                this.$el.toggleClass 'expanded'
            else  # 标题点击，切换
                event.stopPropagation()
                url = '#' + this.templateHelpers.getStreamId.apply this.model.attributes
                if window.location.hash == url
                    App.vent.trigger 'stream:reset', url.substring('#'.length)
                 else
                    App.router.navigate url, {trigger: true}
                App.vent.trigger 'article:focus'
            return
        modelEvents:
            'change': 'changed'
        changed: ()->
            counter = this.templateHelpers.getCount.apply this.model.attributes, ['unread']
            this.ui.counter.html "(#{counter}"
            this.ui.counter.toggleClass 'on', counter=='0'
            return
    LabelsView = Backbone.Marionette.CollectionView.extend
        itemView: LabelView
        setCurrent: (url)->
            # 设置焦点
            App.labelsView.$el.find('li.current').removeClass 'current'
            App.labelsView.$el.find('li[data-id="' + url + '"]').addClass 'current'
            return
    ArticleView = Backbone.Marionette.ItemView.extend
        template: '#article-template'
        initialize:->
        templateHelpers:
            prettyDate: (time)->
                _.prettyDate time
            getContent:->
                if @content && @content.content
                    return @content.content
                if @summary && @summary.content
                    return @summary.content
                ""
            getItemClass:->
                klasses=[]
                klasses.push 'read' if _.contains(@categories, 'state/read')
                klasses.push 'starred' if _.contains(@categories, 'state/starred')
                klasses.push 'markasread' if _.contains(@categories, 'state/markasread')
                klasses.join ' '
        events:
            'click div.article-origin': 'originClicked'
            'click a': 'linkClicked'
        originClicked: (event)->
            origin = @model.get('origin')
        onRender:->
            @$el.find('.article-item')
            .toggleClass('read', @model.isRead())
            .toggleClass('markasread', @model.isMarkAsRead())
            .toggleClass('starred', @model.isStarred())
            .find('img').removeAttr('width height')
            return
    AppStorage = Backbone.Marionette.Controller.extend
        cached_items: new ArticleList [],
            model: Article
            url: ''
            page_size: 20
            continuation: ''
        initialize:->
            @loadSubscriptions()
            unless @feeds.length
                @loadSubscriptionsRemote ()=>
                    @buildLabels()
                    @saveSubscriptions()
                    return
            else
                @buildLabels()
            @loadItems()
            return
        buildLabels: ()->
            @labels = new LabelList()
            @allLabel = new Label
                'id':App.all_label_id
                'title': 'All'
                'feeds': new FeedList()
            @othersLabel = new Label
                'id':App.other_label_id
                'title': 'Others'
                'feeds': new FeedList()
            @mutesLabel = new Label
                'id':App.mutes_label_id
                'title': 'Mutes'
                'feeds': new FeedList()
            @labels.add @allLabel
            @labels.add @othersLabel
            @labels.add @mutesLabel
            @feeds.each (feed)=>
                @allLabel.addFeed feed
                if feed.mute
                    @mutesLabel.addFeed feed
                if feed.get('categories') and feed.get('categories').length
                    _.each feed.get('categories'), (category)->
                        label = @labels.get category
                        unless label
                            label = new Label
                                id: category
                                title: category
                                feeds: new FeedList()
                            @labels.add label
                        label.addFeed feed
                    ,@
                return
            @labels.forEach (label)->
                label.get('feeds').sort()
                return
            @labels.sort()
            @
        feeds: new FeedList()
        labels: new LabelList()
        getFeedByStreamId:(streamId)->
            @feeds.get streamId
        getFeeds:->
            @feeds
        getLabel:(label_name)->
            @labels.get label_name
        getLabels:->
            @labels
        valid_filters: ['state/reading-list', 'state/unread', 'state/starred']
        setStreamFilter:(name)->
            filter = if _.contains(@valid_filters, name) then name else _.first(@valid_filters)
            localStorage.setItem 'storage-stream-filter', filter
        getStreamFilter:->
            localStorage.getItem('storage-stream-filter') or _.first(@valid_filters)
        setStreamId:(streamId)->
            localStorage.setItem 'storage-stream-id', streamId
        getStreamId:->
            localStorage.getItem('storage-stream-id') or _.first(@valid_filters)
        getCachedItems:(collection)->
            return [] unless collection
            streamId = collection.stream
            unless streamId
               throw "streamId can not be null"
            filter = @getStreamFilter()
            cached_items = []
            t = parseInt $.now()/1000
            if collection.length
                t = collection.last().get 'updated'
            @cached_items.each (cached_item)->
                if cached_item.get('updated')>t
                    return
                categories = cached_item.get 'categories'
                if streamId.indexOf('label/')==0 && not _.contains(categories, streamId)
                    return
                if streamId.indexOf('feed/')==0 && cached_item.get('origin')!= streamId
                    return
                if streamId.indexOf('state/')==0
                    if streamId=='state/unread' and (cached_item.isRead() or cached_item.isMarkAsRead())
                        return
                    if streamId=='state/starred' && not cached_item.isStarred()
                        return
                if filter=='state/unread' and (cached_item.isRead() or cached_item.isMarkAsRead())
                    return
                if filter=='state/starred' && not cached_item.isStarred()
                    return
                cached_items.push _.pick(cached_item, 'id', 'updated')
                return
            , @
            cached_items.sort (a, b)->
                b.updated - a.updated
            _.head cached_items, collection.page_size*2
        getItemsRemote:(collection, callback)->
            qsa = []
            url = '/reader/api/0/stream/contents/' + collection.stream
            url = "var/data/reader_items.json"
            qsa.push ['stream', collection.stream]

            qsa.push ['n', collection.page_size]
            qsa.push ['ck', $.now()]
            if collection.continuation
                qsa.push ['c', collection.continuation]
            filter = this.getStreamFilter()
            if filter && filter !=_.first(@valid_filters)
                qsa.push ['filter', filter]
            qs = []
            for p in qsa
                qs.push "#{p[0]}=#{p[1]}"
            url+= '?' + qs.join('&')
            $.ajax
                url: url
                type: 'POST'
                beforeSend: (xhr)->
                    xhr.overrideMimeType "application/json; charset=UTF-8"
                    return
                data: JSON.stringify
                    version: '1.0'
                    items: @getCachedItems collection
            .done (data)=>
                itemsAreChanged = false
                for i, attributes of data
                    unless attributes.cached
                        article = new Article attributes
                        @cached_items.add article
                        collection.add article if collection
                        itemsAreChanged  = true
                    else
                        article = @cached_items.get attributes.id
                        itemIsChanged = false
                        if attributes.categories
                            old_catetories = article.get 'categories'
                            categories = attributes.categories
                            diff = _.diff old_catetories, categories
                            if diff.added.length or diff.removed.length
                                itemIsChanged = true
                            if itemIsChanged
                                article.set {categories}
                collection.continuation = data.continuation if collection
                @saveItems() if itemsAreChanged
                callback and callback()
                return
        loadSubscriptionsRemote:(callback)->
            $.ajax
                #url: "/reader/api/0/subscription/list?ck=#{$.now()}"
                url: "var/data/subscriptions.json?ck=#{$.now()}"
                type: 'POST'
                beforeSend: (xhr)->
                    xhr.overrideMimeType "application/json; charset=UTF-8"
                    return
            .done (data)=>
                data = _.map data, (row, i)->
                    for field,label of App.stat_fields
                        old_field ="#{field}_count"
                        if _.has row, old_field
                            row[field] = row[old_field]
                            delete row[old_field]
                    row
                @feeds.reset data
                callback && callback()
                return
            return
        loadSubscriptions:->
            @feeds.reset JSON.parse localStorage.getItem 'subscriptions'
        loadItems:->
            @cached_items.reset JSON.parse localStorage.getItem 'item'
        saveSubscriptions:->
            localStorage.removeItem 'subscriptions'
            localStorage.setItem 'subscriptions', JSON.stringify(@feeds.toJSON())
            return
        getItem: (id)->
            @cached_items.get id
        saveItems:->
            localStorage.removeItem 'item'
            items = @cached_items.toJSON()
            max_cache_items = 100
            if items.length>max_cache_items
                items.sort (a,b)->
                    b.updated-a.updated
                #auto trim results to 100 if more than that number
                items.length=max_cache_items
            localStorage.setItem 'item', JSON.stringify(items)
        quickSubscribe: (query, callback)->
            $.ajax
                url: "/reader/api/0/subscription/quickadd?ck=#{$.now()}"
                type: 'POST'
                data:
                    "quickadd": query
            .done (data)->
                callback && callback(data)
    AppRouter = Backbone.Router.extend
        initialize:->
            @routesHit = 0
            Backbone.history.on 'route', ()->
                @routesHit++
                return
            , @
            @mark_timer = null
            return
        next:->
        routes:
            'item/:id': "itemView"
            'stream/*query': "streamView"
        itemView:(id)->
            App.vent.trigger 'article:change', id
            return
        streamView:(stream)->
            if App.indexList.stream == stream
                App.indexList.trigger 'article:current-change', App.indexList.currentId
                return
            App.vent.trigger 'stream:reset', stream
            return
        back:->
            if @routesHit
                window.history.back()
            else
                @navigate buildUrlHash('stream', 'state/reading-list'),
                    trigger : true
                    replace : true
            return
    buildUrlHash = (prefix, path)->
        "##{prefix}/#{encodeURIComponent(path)}"
    window.App = App = new Backbone.Marionette.Application()
    _.extend App,
        all_label_id: '***ALL***'
        other_label_id: '***OTHERS***'
        mutes_label_id:'***MUTES***'
        _:(msg_id)->
            msg_id
    App.stat_fields =
        unread: App._ 'unread'
        all: App._ 'all'
        starred: App._ 'starred'
        markasread: App._ 'markasread'
        read: App._ 'read'
    App.hot_keys =
        'k':
            'desc': '向上滚动'
            'alias': 'left'
            'handler': ()->
                App.vent.trigger 'article:next', App.articleView.model.id
                false
        'j':
            'desc': '向下滚动'
            'alias': 'right'
            'handler': ()->
                App.vent.trigger 'article:prev', App.articleView.model.id
                false
        'f1':
            name: 'F1/?'
            alias: 'shit+/'
            'desc': '获取本帮助'
            'handler': ()->
                App.vent.trigger 'help:shortcuts'
                false
        's':
            'desc': '标记喜欢/不喜欢'
            'handler':()->
                App.articleView.model.toggle 'star'
                false
        'a':
            'desc': '标记已读/未读'
            'handler':()->
                App.articleView.model.toggle 'markasread'
                false
        '/':
            'desc': '搜索'
            'handler': ()->
                false
    App.addInitializer (options)->
        App.router = new AppRouter()
        App.storage = new AppStorage()
        streamId = App.storage.getStreamId()
        streamFilter = App.storage.getStreamFilter()

        App.labelsView = new LabelsView
            el: '#label-view'
            collection: App.storage.getLabels()
        App.labelsView.render()
        App.indexList = new ArticleList [],
            stream: streamId
            page_size: 20
            continuation: ''
        App.indexView = new IndexListView
            el: "#index-view"
            itemView: IndexItemView
            collection: App.indexList
        App.indexView.render()

        App.storage.setStreamFilter streamFilter
        App.indexView.setStreamFilter streamFilter

        App.vent.on 'stream:reset', (stream)->
            if stream
                App.indexList.stream = stream
            App.indexList.continuation = null
            App.indexList.reset()
            App.indexView.scrollTop 0
            # 加载数据
            App.indexList.loadMore ()->
                if App.indexList.length > 0
                    App.vent.trigger 'article:change', App.indexList.at(0).id
                    return
            App.labelsView.setCurrent 'stream/'+(App.indexList.url)
            return
        App.vent.trigger 'stream:reset'
        App.vent.on 'article:change', (id)->
            if @read_countdown_timer
                clearTimeout @read_countdown_timer
                @read_countdown_timer = null
                if App.articleView.model
                    App.articleView.model.toggle 'markasread', true
            newArticle = App.storage.getItem id
            App.articleView = new ArticleView
                el: '#article-view'
                model: newArticle
            App.articleView.render()
            App.indexList.trigger 'article:current-change', id
            # 修改标题
            document.title = newArticle.get 'title'
            @read_countdown_timer = setTimeout =>
                @read_countdown_timer = null
                App.articleView.model.toggle 'read', true
                return
            ,3000
            return
        App.vent.on 'article:prev', (id)->
            id = App.articleView.model.id unless id
            return unless App.indexList
            article = App.indexList.getPrev id
            if article
                url = "#item/#{article.get('id')}"
                App.router.navigate url,
                    trigger: true
                    replace: true
            else
                console.log "this is the first article"
            return
        App.vent.on 'article:next',  (id)->
            return unless App.indexList
            id = App.articleView.model.id unless id
            article = App.indexList.getNext id
            if article
                url = "#item/#{article.get('id')}"
                App.router.navigate url,
                    trigger: true
                    replace: true
            else
                console.log "this is the last article"
            return
        App.vent.on 'filter', (state)->
            if state=='all'
                stream = 'state/reading-list'
            else
                stream = "state/#{state}"
            App.indexView.setStreamFilter stream
            App.storage.setStreamFilter stream
            App.vent.trigger 'stream:reset'
            return
        Backbone.history.start()
        return
    App.vent.on 'help:shortcuts', ()->
        return
    App.addInitializer (options)->
        evt = 'keypress'
        for key, key_config of App.hot_keys
            $(document).bind evt, key, key_config.handler
            if key_config.alias
                for alias_key in key_config.alias.split ' '
                    $(document).bind evt, alias_key, key_config.handler
        return
    App.addInitializer (options)->
        $('.app-toolbar .article_list.panel').delegate 'button.btn', 'click', ->
            $btn = $(this)
            if $btn.hasClass 'mark'
                $.ajax
                    url: "/reader/api/0/mark-all-as-read?ck=#{$.now()}"
                    type: 'POST'
                    data:
                        "s": App.indexList.stream
                        "t": App.indexList.title
                .done (data)->
                    console.log data
                    return
            else if $btn.hasClass 'filter'
                for state in ['all', 'unread', 'starred']
                    if $btn.hasClass state
                        App.vent.trigger 'filter', state
                        break
            return
        $('.app-toolbar .article_detail.panel').delegate 'button.btn', 'click', ->
            $btn = $(this)
            if $btn.hasClass 'toggle'
              for state in ['markasread', 'star']
                  if $btn.hasClass state
                      App.articleView.model.toggle state
                      break
            else if $btn.hasClass 'goto'
                for state in ['refresh', 'next', 'prev']
                    if $btn.hasClass state
                        App.vent.trigger "article:#{state}"
                        break
            return
        return
    App.start()
    return
