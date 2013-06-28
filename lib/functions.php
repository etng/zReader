<?php
function gz_get_contents($filename)
{
    ob_start();
    readgzfile($filename);
    return ob_get_clean();
}
function current_member($redirect=false){
    static $current_member;
    if(!$current_member){
        try{
            if(empty($_COOKIE['mid'])){
                throw new Exception("login first please");
            }
            $current_member = Reader_Member::find($_COOKIE['mid']);
            if(!$current_member){
                throw new Exception("no such member");
            }
        }
        catch(Exception $e){
            $_SESSION['notice'] = $e->getMessage();
            if($redirect){
                header('location:' . BASE_URL_ABS . 'auth.php');
                die();
            }
        }
    }
    return $current_member;
}

function addCookie($name, $value, $lifetime=7200, $path='/', $domain='', $http_only=1, $secure=0)
{
    if(!$domain){
        $domain = $_SERVER['HTTP_HOST'];
    }
    @setcookie($name, $value, time()+$lifetime,$path,$domain, $secure, $http_only);
}
function removeCookie($name, $path='/', $domain='', $http_only=1, $secure=0)
{
    if(!$domain){
        $domain = $_SERVER['HTTP_HOST'];
    }
    @setcookie($name, null, time()-8640000,$path,$domain, $secure, $http_only);
}
function array_pick($array, $keys){
    $d_arr = array();
    foreach($keys as $alias=>$field){
        if(is_numeric($alias)){
            $alias = $field;
        }
        $d_arr[$alias]=$array[$field];
    }
    return $d_arr;
}

function get_template($controller='index', $action='index'){
    if(!file_exists($tpl_file=WEB_ROOT . "/var/templates/{$controller}/{$action}.php")){
        throw new Exception("missing template file {$tpl_file}");
    }
    return $tpl_file;
}
function get_layout($layout='default'){
    if(!file_exists($tpl_file=WEB_ROOT . "/var/templates/layout_{$layout}.php")){
        throw new Exception("missing layout file {$tpl_file}");
    }
    return $tpl_file;
}
