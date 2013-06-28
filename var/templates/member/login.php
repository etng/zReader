<?php
$title_for_layout = '用户登录';
?>
<div class="row-fluid">
    <div class="span6">
        <div>
            <p> this is the description of this site</p>
            <p> this is the description of this site</p>
            <p> this is the description of this site</p>
            <img src="<?php echo ASSETS_URL;?>images/screenshot.jpg" />
            <p> this is the description of this site</p>
            <p> this is the description of this site</p>
            <p> this is the description of this site</p>
            <p> this is the description of this site</p>
            <p> this is the description of this site</p>
            <p> this is the description of this site</p>
            <p> this is the description of this site</p>
        </div>
    </div>
    <div class="span2"></div>
    <div class="span4">
        <h3>请先登录</h3>
        <a href="<?php echo Douban::getAuthorizeURL();?>">
        <img src="<?php echo ASSETS_URL;?>images/login_with_douban_32.png" alt="使用豆瓣帐号登录" />
        </a>
    </div>
</div>
