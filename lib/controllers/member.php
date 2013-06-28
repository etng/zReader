<?php
defined('IN_READER') or die('HACKER?');

require('lib/Douban.php');
Douban::$config = $config->douban;
if($action=='oauth_done'){
    if(!empty($_GET['error'])){
        die('authorize faile for ' . $_GET['error']);
    }
    $token = Douban::getAccessToken($_GET['code']);
    if(!empty($token['code'])){
        //something wrong
        error_log("auth error: douban {$token['request']} {$token['code']} {$token['msg']}");
        header('location:' . Douban::getAuthorizeURL());
        die();
    }
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
    addCookie('mid', $oUser->id, 86400, BASE_URL);
    $_SESSION['u'] = $oUser->toArray();
    header('location:' . BASE_URL_ABS);
    exit(0);
}
elseif($action=='backdoor'){
    $oUser = Reader_Member::find($segments?$segments[0]:1);
    addCookie('mid', $oUser->id, 86400, BASE_URL);
    $_SESSION['u'] = $oUser->toArray();
    header('location:' . BASE_URL_ABS);
    exit(0);
}
elseif($action=='logout'){
    unset($_SESSION['u']);
    removeCookie('mid', BASE_URL);
    header('location:' . BASE_URL_ABS . 'member/me');
    exit(0);
}
elseif($action=='my'){
    $result = $douban->direct('book/search', array(
        'q' => 'Compass',
    ));
    var_dump('searching for compass', $result);
}
elseif($action=='load_opml'){
    $uploaddir = WEB_ROOT . '/var/uploads/';
    $field = 'opml_file';
    $opml_file = $uploaddir . md5(basename($_FILES[$field]['name'])) . '.opml';
    try{
        if (!move_uploaded_file($_FILES[$field]['tmp_name'], $opml_file)) {
            throw new Exception("can not move tmp file");
        }
        $count = Reader_Subscription::loadOpml(current_member(), $opml_file);
        $_SESSION['notice'] = "{$count} feeds added";
        header('location:' . BASE_URL_ABS);
        die();
    }catch(Exception $e){
        echo $e->getMessage();
        die();
    }
}
elseif($action=='login'){
    include get_template('member', 'login');
}
elseif($action=='opml'){
    include get_template('member', 'opml');
}
else{
    include get_template('member', 'profile');
}