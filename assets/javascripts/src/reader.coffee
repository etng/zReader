_.extend Object
    mergeDelta: (delta)->
        for field, delta of delta
            if _.has @, field
                @[field]=@field+delta
        @
_.mixin
    diff: (a,b)->
        removed: _.difference b, a
        added: _.difference a, b
App.Counters = {}
getCachedItems:(collection)->
    streamId = collection.url
    if streamId.indexOf('stream/')==0
        streamId = streamId.substring('stream/'.length)
    filter = @getStreamFilter()
    cached_items = []
    t = parseInt $.now()/1000
    if collection.length
        t = collection.last().get 'updated'
    for i,cated_item of @cached_items
        if cached_item.get('updated')>t
            continue
        categories = cached_item.get 'categories'
        if streamId.indexOf('lable/')==0 && not _.contains(categories, streamId)
            continue
        if streamId.indexOf('feed/')==0 && cached_item.get('origin')!= streamId
            continue
        if streamId.indexOf('state/')==0
            if streamId=='state/unread' and (cached_item.isRead() or cached_item.isMarkAsRead())
                continue
            if streamId=='state/starred' && not cached_item.isStarred()
                continue
        if filter=='state/unread' and (cached_item.isRead() or cached_item.isMarkAsRead())
            continue
        if filter=='state/starred' && not cached_item.isStarred()
            continue
        cached_items.push _.pick(cached_item, 'id', 'updated')
    cached_items.sort (a, b)->
        b.updated - a.updated
    _.head cached_items, collection.page_size*2

App.storage =
    cached_items: new ArticleList([],
        model: Article
        url: ''
        page_size: 20
        continuation: ''
    )
    initialize:->

    buildLabels: (feeds)->
        @lables = new LabelList()
        @allLabel = new Label
            'id': '***ALL***'
            'title': 'All'
            'feeds': new FeedList()

        @othersLabel = new Label
            'id': '***OTHERS***'
            'title': 'Others'
            'feeds': new FeedList()
        @mutesLabel = new Label
            'id': '***MUTES***'
            'title': 'Mutes'
            'feeds': new FeedList()
        @labels.add @allLabel
            .add @othersLabel
            .add @mutesLabel
        for feed_attributes in feeds
            feed = new Feed feed_attributes
            delta  = _.pick feed_attributes, 'all', 'unread', 'starred', 'markasread'
            @allLabel.add feed
            if feed.mute
                @mutesLabel.add feed
            if feed.get('categories') and feed.get('categories').length
                _.each feed.get('categories'), (category)->
                    label = labels.get category
                    unless label
                        label = new Label
                            id: category
                            title: category
                            feeds: new FeedList()
                        @labels.add label
                    label.add feed

        @labels.forEach (label)->
            label.get('feeds').sort()
            return
        @labels.sort()
        @
    getFeedByStreamId:(streamId)->
        @feeds.get streamId

    getFeeds:->
        @feeds
    getLabel:(label_name)->
        @labels.get label_name
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
    getItemsRemote:(collection, callback)->
        url = '/reader/api/0/stream/contents/' + collection.url.substring ('stream/'.length)
        qsa = []
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
            data: JSON.stringify
                version: '1.0'
                items: @getCachedItems collection
            done:(data)=>
                itemsAreChanged = false
                for i, attributes of data.items
                    unless attributes.cached
                        article = new Article attributes
                        @cached_items.add article
                        collection.add article
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
                collection.continuation = data.continuation
                @saveItems() if itemsAreChanged
    loadSubscriptionsRemote:->
        $.ajax
            url: "/reader/api/0/subscription/list?ck=#{$.now()}"
            type: 'POST'
            done:(data)=>
                @feeds.reset data.subscriptions
    loadSubscriptions:->
        @feeds.reset JSON.parse localStorage.getItem 'subscriptions'
    loadItems:->
        @cached_items.reset JSON.parse localStorage.getItem 'items'
    saveSubscriptions:->
        localStorage.removeItem 'subscriptions'
        localStorage.getItem 'subscriptions', JSON.stringify(@feeds.toJSON())
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
            done:(data)->
                callback && callback(data)


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
            done:=>
                @set 'title', new_name
                @get('feeds').forEach (feed)->
                    categories = feed.get 'categories'
                    if _.contains categories, old_name
                        categories[categories.indexOf(old_name)]=new_name
    addFeed:(feed)->
        delta  = _.pick @attributes, 'all', 'unread', 'starred', 'markasread'
        @get('feeds').add feed
        @mergeDelta delta
        @


Feed= Backbone.Model.extend
    defaults:
        #stat field begin
        unread: 0
        all: 0
        starred: 0
        markasread: 0
        read: 0
        #stat field end
        title: ''
        mute: false

    initialize: ->
        stat_fields =
            unread: App._ 'unread'
            all: App._ 'all'
            starred: App._ 'starred'
            markasread: App._ 'markasread'
            read: App._ 'read'
        @on 'change', =>
            delta = {}
            for field, label of stat_fields
                delta[field]=@get(field)-@previous(field)
            App.Counters.all.mergeDelta delta
            if model.mute
                Appl.Counters.mute.mergeDelta delta
            if model.get('categories') && model.get('categories').length
                _.each model.get('categories'), (category)->
                    App.Counters.category[category].mergeDelta delta
                    return
            else
                App.Counters.others.mergeDelta delta
    removeLabel:(label)->
        if App.storage.labels.get(label).isLocked()
            return
        $.ajax
            url: "/reader/api/0/disable-tag?ck=#{$.now()}"
            type: 'POST'
            data:
                "s": label
            done:(data)=>
                categories = @get 'categories'
                categories.splice categories.indexOf(label), 1
                @set 'categories'

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
            rank += @get('field') * weight
        rank

FeedList = Backbone.Collection.extend
    model: Feed
    initialize:->
    comparator:(a, b)->
    # is it is muted, then go to last
        if a.get('mute') && !b.get('mute')
            return 1
        if !a.get('mute') && b.get('mute')
            return -1
    # if unread count is zero, then go to last
        if a.get('unread')==0 and b.get('unread')>0
            return 1
        if a.get('unread')>0 and b.get('unread')==0
            return -1
        # the low the rank, the last the positon
        rank_a = a.getSortRank()
        rank_b = b.getSortRank()
        if rank_a<rank_b
            return 1
        if rank_a>rank_b
            return -1

        if a.get('title')==b.get('title')
            return 0
        else if a.get('title')>b.get('title')
            return 1
        else
            return -1
Article = Backbone.Model.extend
    state_read: 'state/read'
    state_markasread: 'state/markasread'
    state_starred: 'state/starred'
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
        $.ajax
            url: "/reader/api/0/edit-tag?ck=#{$.now}"
            type: 'POST'
            data:
                "a": "state/starred"#when add mark status
                "r": "state/starred"#when remove mark of status
                "i": obj.id
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
        @url == options.url
        @loading = false
        @on 'article:current-change', (id)=>
            @currentId = id
            return
    getNext:(id)->
        index = -1
        @forEach (article)->
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
        @forEach (article)->
            if article.get('id')==id
                index = i-1
                return false
            return
        return null if index<0
        @at index
    loadMore:(onload)->
        @loading = true
        App.storage.getItems @, ->
            @loading = false
            onload && onload()
            return
    isLoading:->
        @loading

ArticleView = Backbone.Marionette.ItemView.extend
    template: 'article-template'
    initialize:->
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

