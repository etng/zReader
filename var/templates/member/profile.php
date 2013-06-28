<?php
$user_name = current_member()->nick_name;
$title_for_layout = "{$user_name}主页";
?>
<div class="row-fluid">
    <div class="span2"></div>
    <div class="span8">
        欢迎<?php echo current_member()->nick_name;?>
        <img src="<?php echo current_member()->avatar;?>" alt="<?php echo current_member()->oauth_user_name;?>" />
        <a href="<?php echo BASE_URL_ABS;?>member/logout">
        <img src="<?php echo ASSETS_URL; ?>images/douban_favicon_32x32.png" alt="注销" />注销 </a>

        <a href="<?php echo BASE_URL_ABS;?>member/opml">导入OPML文件 </a>
    </div>
    <div class="span2">
    </div>
</div>
