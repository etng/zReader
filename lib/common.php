<?php
define('BASE_PATH', dirname(__file__) . '/../');
set_include_path(get_include_path()
    . PATH_SEPARATOR . realpath(BASE_PATH . '/lib/zendframework/library')
    . PATH_SEPARATOR . realpath(BASE_PATH . '/lib')
);
error_reporting(E_ALL);
require_once 'Zend/Loader/Autoloader.php';
require_once 'Et/Et.php';
Et::registerNamespace('Reader_');
defined('API_URL') || define('API_URL', BASE_URL_ABS. 'api.php');
$loader = Zend_Loader_Autoloader::getInstance();

$logger = Zend_Log::factory(array(
    array(
        'writerName'   => 'Stream',
        'writerParams' => array(
            'stream'   => BASE_PATH . '/var/log/app.log',
        ),
        'filterName'   => 'Priority',
        'filterParams' => array(
            'priority' => Zend_Log::DEBUG,
        ),
    ),
));
if (PHP_SAPI === 'cli')
{
    $output_writer = new Zend_Log_Writer_Stream('php://output');
    $logger->addWriter($output_writer);
}


$frontendOptions = array(
    'lifetime' => 86400,
    'automatic_serialization' => true
);
$backendOptions = array('cache_dir' => BASE_PATH . '/var/tmp/');
$cache = Zend_Cache::factory(
    'Core', 'File', $frontendOptions, $backendOptions
);

Zend_Feed_Reader::setCache($cache);
Zend_Feed_Reader::useHttpConditionalGet();

$config = new Zend_Config_Ini(BASE_PATH . '/var/config.ini');
$db = Zend_Db::factory($config->database);
Zend_Db_Table::setDefaultAdapter($db);
Zend_Db_Table_Abstract::setDefaultMetadataCache($cache);
function gz_get_contents($filename)
{
    ob_start();
    readgzfile($filename);
    return ob_get_clean();
}
function current_member(){
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
            header('location:' . BASE_URL_ABS . 'auth.php');
            die();
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
        var_dump($alias, $field);
        $d_arr[$alias]=$array[$field];
    }
    return $d_arr;
}
