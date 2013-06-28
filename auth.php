<?php
session_start();
require dirname(__file__).'/lib/common.php';
require('lib/Douban.php');
Douban::$config = $config->douban;

$action = trim($_GET['action']);
if(!empty($_SERVER['PATH_INFO'])){
    $segments  = explode('/', $_SERVER['PATH_INFO']);
    $action = $segments[1];
}
if($action=='done'){
    if(!empty($_GET['error'])){
        die('authorize faile for ' . $_GET['error']);
    }
    $token = Douban::getAccessToken($_GET['code']);
    $profile = Douban::get('user/~me');
    $user_info = array_merge(
        array('oauth_server'=>'douban'),
        array_pick($token, array(
            'oauth_access_token'=>'access_token',
            'oauth_user_id'=>'douban_user_id',
            'oauth_user_name'=>'douban_user_name',
            'nick_name'=>'douban_user_name',
        )),
        array_pick($profile, array('signature', 'avatar'))
    );
    $user_info['email'] = "{$user_info['oauth_user_name']}@oauth.{$user_info['oauth_server']}.com";
    $oUser = Reader_Member::findOrCreate(array_pick($user_info, array('oauth_server', 'oauth_user_id')), $user_info);
    @setcookie('mid', $oUser->id, time()+86400,BASE_URL,$_SERVER['HTTP_HOST'], 0, 1);
    addCookie('mid', $oUser->id, 86400, BASE_URL);
    $_SESSION['u'] = $oUser->toArray();
    header('location:' . BASE_URL_ABS);
    exit(0);
}
elseif($action=='logout'){
    unset($_SESSION['u']);
    removeCookie('mid', BASE_URL);
    header('location:' . BASE_URL_ABS . 'auth.php?action=me');
}
elseif($action=='my'){
    $result = $douban->direct('book/search', array(
        'q' => 'Compass',
    ));
    var_dump('searching for compass', $result);
}
else{
?>
<meta charset="UTF-8">
<?php
    if(empty($_SESSION['u'])){
?>
<meta charset="UTF-8">
<a href="<?php echo Douban::getAuthorizeURL();?>">
<img src="<?php echo ASSETS_URL;?>images/login_with_douban_32.png" alt="使用豆瓣帐号登录" />
</a>
<?php
    }else{
        //var_dump($_SESSION['u']);
?>
    欢迎<?php echo $_SESSION['u']['oauth_user_name'];?>
        <img src="<?php echo $_SESSION['u']['avatar'];?>" alt="<?php echo $_SESSION['u']['oauth_user_name'];?>" />
            <a href="<?php echo BASE_URL_ABS;?>auth.php?action=logout">
            <img src="<?php echo ASSETS_URL; ?>images/douban_favicon_32x32.png" alt="注销" />注销 </a>
<?php
    }
}

