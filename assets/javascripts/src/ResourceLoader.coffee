window.App=App=
    Config:
        #每项资源都有其依赖的资源的id列表
        resources:
            a:
                url: 'a'
                dependencies:[]
                cache:
                    places: ['localStorage']
                    name: 'a'
                onload:(response, resource)->
                    console.log  resource.name, response
                    return
            b:
                url: 'b'
                dependencies:[]
                cache:
                    places: ['localStorage']
                    name: 'b'
                onload:(response, resource)->
                    console.log  resource.name, response
                    return
            c:
                url: 'c'
                cache:
                    places: ['localStorage']
                    name: 'c'
                dependencies:[
                    'a'
                ]
                onload:(response, resource)->
                    console.log  resource.name, response
                    return
            d:
                url: 'd'
                cache:
                    places: ['localStorage']
                    name: 'd'
                dependencies:[
                    'a'
                    'b'
                    'c'
                ]
                onload:(response, resource)->
                    console.log  resource.name, response
                    return
            e:
                url: 'e'
                cache:
                    places: ['localStorage']
                    name: 'e'
                dependencies:[
                    'a'
                    'b'
                    'c'
                ]
                onload:(response, resource)->
                    console.log  resource.name, response
                    return
            f:
                url: 'f'
                dependencies:[
                    'd'
                ]
                onload:(response, resource)->
                    console.log  resource.name, response
                    return
        #资源依赖检查时间间隔，单位：毫秒
        resouce_dependency_check_interval: 200
        #直接检查资源
        load_dependencies_in_time: true
App.cache_prefix = 'cvscr_'
App.storeData = (name, data, places, lifetime)->
    places=['memory', 'localStorage'] unless places
    cache_key = (App.cache_prefix + name).toUpperCase()
    if _.contains(places, 'memory')
        window[cache_key] = data
    if _.contains(places, 'localStorage') and window.localStorage
        localStorage.removeItem cache_key
        if lifetime
            localStorage.setItem cache_key, JSON.stringify {data, ls_expired_at:new Date().getTime()+86400*1000}
        else
            localStorage.setItem cache_key, JSON.stringify data
    return
App.fetchData = (name, places, default_val)->
    cache_key = (App.cache_prefix + name).toUpperCase()
    places=['memory', 'localStorage'] unless places
    for place in places
        if place=='memory'
            if window[cache_key]
                return window[cache_key]
        else if place=='localStorage' and window.localStorage
            serialized_data = localStorage.getItem cache_key
            if serialized_data
                decoded_data = JSON.parse serialized_data
            if decoded_data
                if _.has(decoded_data, 'ls_expired_at')
                    if decoded_data.ls_expired_at<(new Date().getTime())
                        return decoded_data.data
                    else
                        localStorage.removeItem cache_key
                else
                    return decoded_data
    return default_val
#资源加载状态记录
App.resources_status={}
#资源加载
App.loadResouce = (resource, use_cache)->
    if App.Config.load_dependencies
        for dependency_resource_name in resource.dependencies
            if App.Config.resources[dependency_resource_name] && not App.resources_status[dependency_resource_name]
                dependency_resource = App.Config.resources[dependency_resource_name]
                dependency_resource.name = dependency_resource_name
                App.loadResouce dependency_resource
    App.resources_status[resource.name]='loading'
    from_cache = false
    handleResponse = (response)->
        #console.log response
        App.resources_status[resource.name]='loaded'
        checkDependencies = ->
            dependencies_loaded = true
            for dependency_resource_name in resource.dependencies
                #console.log dependency_resource_name
                if dependency_resource_name==resource.name
                    continue
                #console.log App.resources_status[dependency_resource_name]
                unless App.resources_status[dependency_resource_name] and App.resources_status[dependency_resource_name]=='inited'
                    dependencies_loaded=false
                    break
            unless dependencies_loaded
                #console.log 'delaying ...', resource.name, resource.dependencies.join(',')
                _.delay checkDependencies, App.Config.resouce_dependency_check_interval
                return
            App.resources_status[resource.name]='inited'
            resource.onload && resource.onload(response, resource)
            if !from_cache and resource.cache
                App.storeData resource.cache.name, response, resource.cache.places, resource.cache.lifetime
            return
        checkDependencies()
    use_cache = 1
    if resource.cache and use_cache
        response = App.fetchData resource.cache.name, resource.cache.places
        if response
            from_cache=true
            handleResponse response
            return
    $.ajax
        url: '/mock_response.php?a=' + resource.url
        method: 'POST'
        data: if resource.data then _.result(resource, 'data') else ""
    .done handleResponse
    return
App.init = ->
    for name,resource of App.Config.resources
        resource.name = name
        App.loadResouce resource
App.init()
