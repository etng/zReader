<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title><?php echo $config->site_name;?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="">
    <meta name="author" content="">
    <link href="<?php echo ASSETS_URL;?>/stylesheets/reset.css" rel="stylesheet">
    <link href="<?php echo ASSETS_URL;?>/stylesheets/zReader.css" rel="stylesheet">
    <link href="<?php echo ASSETS_URL;?>/stylesheets/fontello.css" rel="stylesheet">
    <link href="<?php echo ASSETS_URL;?>/stylesheets/extra.css" rel="stylesheet">
    <link rel="shortcut icon" href="<?php echo ASSETS_URL;?>/ico/favicon.png">
<script type="text/javascript">
window.API_URL="<?php echo API_URL;?>";
var subscriptionData = <?php echo json_encode(current_member()->getSubscriptions());?>;
var streamData = null;
</script>
  </head>

  <body>
    <div class="container no-user-select">
        <div class="app-toolbar">
            <div class="feed_list panel">
            <i class="logo"></i>
            <span class="brand"><?php echo $config->site_name;?></span>
            </div>
            <div class="article_list panel">
                <button class="btn mark markasread">Mark All As Read</button>
                <button class="btn filter all">All</button>
                <button class="btn filter unread">Unread</button>
                <button class="btn filter starred">Starred</button>
            </div>
            <div class="article_detail panel">
                <button class="btn toggle starred">Star</button>
                <button class="btn toggle markasread">Read</button>
                <button class="btn goto refresh">Refresh</button>
                <button class="btn goto next">Next</button>
                <button class="btn goto prev">Previous</button>
            <span class="member_info">
                欢迎
                <a href="<?php echo BASE_URL_ABS;?>member">
                    <?php echo current_member()->nick_name;?>
                    <img src="<?php echo current_member()->avatar;?>" alt="<?php echo current_member()->oauth_user_name;?>" />
                </a>
                <a href="<?php echo BASE_URL_ABS;?>member/logout">
                    <img src="<?php echo ASSETS_URL; ?>images/douban_favicon_32x32.png" alt="注销" />
                    注销
                </a>
            </span>
            </div>
        </div>
        <div class="app-content">
            <div class="feed_list panel scroll side-tree" id="label-view">
            </div>
            <div class="article_list panel scroll">
                <div id="index-view">
                </div>
            </div>
            <div class="article_detail panel scroll" id="article-view">
            </div>
        </div>
    </div>
    <script type="text/template" id="feed-item-template">
        <i class="icon mute icon-mute <@=getMuteClass()@>"></i>
        <i class="icon more icon-angle-double-right"></i>
        <span data-url="#<@=getStreamId()@>" class="title"><span class="txt"><@=title@></span><span class="counter <@=(getCount('unread')=='0'?'':'on')@>">(<@=getCount("unread")@>)</span></span>
    </script>

    <script type="text/template" id="label-item-template">
        <li class="label" data-id="<@=getStreamId()@>">
            <i class="icon arrow icon-right-open"></i>
            <i class="icon more icon-angle-double-right"></i>
            <span class="title"><@=title@><span class="counter <@=(getCount('unread')=='0'?'':'on')@>">(<@=getCount("unread")@>)</span></span>
        </li>
        <ul class="feed-items"></ul>
    </script>

    <script type="text/template" id="index-item-template">
        <article data-id="<@=id@>">
            <h3 class="index-item-title">
                <i class="icon star icon-star-empty"></i>
                <span data-url="#item/<@=id@>"><@= title @></span>
            </h3>
            <div class="index-item-meta">
                <i class="icon check icon-ok-circle"></i>
                <span class="index-item-time"><@=prettyDate(updated*1000)@></span>
                <span> - </span>
                <span class="index-item-origin"><@= origin.title@></span>
            </div>
        </article>
    </script>

    <script type="text/template" id="article-template">
        <article data-id="<@=id@>" class="article-item <@=getItemClass()@>">
            <div class="article-header">
                <div class="article-origin">
                    <span data-url="#stream/<@=encodeURIComponent(origin.streamId)@>"><@=origin.title@></span>
                </div>
                <h1 class="article-title">
                    <a href="<@=alternate.href@>" target="_blank"><@=title@></a>
                </h1>
                <div class="article-meta">
                    <span class="article-time"><@=prettyDate(updated*1000)@></span>
                    <span> - </span>
                    <span class="article-author"><@=author?author:'unknown'@></span>
                </div>
            </div>
            <div class="article-content">
                <div class="article-content-inner">
                    <div>
                        <@=getContent()@>
                    </div>
                </div>
            </div>
        </article>
    </script>
    <script src="<?php echo ASSETS_URL;?>/javascripts/json2.js"></script>
    <script src="<?php echo ASSETS_URL;?>/javascripts/jquery.js"></script>
    <script src="<?php echo ASSETS_URL;?>/javascripts/jquery.bindWithDelay.js"></script>
    <script src="<?php echo ASSETS_URL;?>/javascripts/jquery.hotkeys.js"></script>
    <script src="<?php echo ASSETS_URL;?>/javascripts/underscore.js"></script>
    <script src="<?php echo ASSETS_URL;?>/javascripts/backbone.js"></script>
    <script src="<?php echo ASSETS_URL;?>/javascripts/backbone.marionette.js"></script>
    <script src="<?php echo ASSETS_URL;?>/javascripts/zReader.js"></script>
  </body>
</html>

