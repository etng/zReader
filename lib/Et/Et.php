<?php
class Et_Core
{
    public static function registerAutoload()
    {
        spl_autoload_register(array('self', 'autoload'));
    }
    protected static $autoload_ns_list= array();
    public static function registerNamespace($ns){
        self::$autoload_ns_list[]=rtrim($ns, '_').'_';
    }
    public static function autoload($klass)
    {
        if(substr($klass, 0, 3)=='Et_')
        {
            require dirname(__file__) . '/../' . str_replace('_', '/', $klass) . '.php';
            return true;
        }
        foreach(self::$autoload_ns_list as $ns){
            if(strpos($klass, $ns)===0)
            {
                require dirname(__file__) . '/../' . str_replace('_', '/', $klass) . '.php';
            }
        }
        return false;
    }
}
class Et extends Et_Core
{
}
umask(0);
Et::registerAutoload();
defined('LIB_ROOT') || define('LIB_ROOT', realpath(dirname(__FILE__) . '/../'));
defined('WEB_ROOT') || define('WEB_ROOT', realpath(LIB_ROOT . '/../'));
defined('BASE_URL')||define('BASE_URL', str_replace('\\', '/', substr(WEB_ROOT, strlen(realpath($_SERVER['DOCUMENT_ROOT'])))) .'/');
defined('BASE_URL_ABS') || define('BASE_URL_ABS', @"http://{$_SERVER['HTTP_HOST']}" . BASE_URL);
defined('ASSETS_ROOT') || define('ASSETS_ROOT',  realpath(WEB_ROOT . '/assets/'));
defined('ASSETS_URL') || define('ASSETS_URL', BASE_URL. 'assets');