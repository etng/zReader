<?php
session_start();
require dirname(__file__).'/lib/common.php';
$controller = 'view';
$action = 'index';
$url = 'REDIRECT_URL';
if(!empty($_SERVER['PATH_INFO'])){
    $pathinfo = ltrim($_SERVER['PATH_INFO'], '/');
}
else if(!empty($_SERVER['REDIRECT_URL'])){
    $pathinfo = ltrim(substr($_SERVER['REDIRECT_URL'], strlen(BASE_URL)), '/');
}

if(!empty($pathinfo))
{
    $segments  = explode('/', $pathinfo);
    if($segments){
        $controller = array_shift($segments);
    }
    if($segments){
        $action = array_shift($segments);
    }
}
if(!current_member() &&  !($controller=='member' && in_array($action, array('login', 'oauth_done', 'backdoor', 'logout')))){
    header('location:' . BASE_URL_ABS . 'member/login');
    die();
}
$layout = 'default';
$title_for_layout = '';
ob_start();
require "lib/controllers/{$controller}.php";
$content_for_layout = ob_get_clean();
if(!empty($layout)){
    include get_layout($layout);
}
else{
    echo $content_for_layout;
}