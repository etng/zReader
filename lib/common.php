<?php
define('BASE_PATH', dirname(__file__) . '/../');
set_include_path(get_include_path()
    . PATH_SEPARATOR . realpath(BASE_PATH . '/lib/zendframework/library')
    . PATH_SEPARATOR . realpath(BASE_PATH . '/lib')
);
error_reporting(E_ALL);
require_once 'Zend/Loader/Autoloader.php';
require_once 'Et/Et.php';
require_once 'functions.php';
Et::registerNamespace('Reader_');
define('IN_READER', true);
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
if(PHP_SAPI === 'cli')
{
    $output_writer = new Zend_Log_Writer_Stream('php://output');
    $logger->addWriter($output_writer);
}


$frontendOptions = array(
    'lifetime' => 86400,
    'automatic_serialization' => true
);
$backendOptions = array('cache_dir' => BASE_PATH . '/var/cache/');
$cache = Zend_Cache::factory(
    'Core', 'File', $frontendOptions, $backendOptions
);

Zend_Feed_Reader::setCache($cache);
Zend_Feed_Reader::useHttpConditionalGet();

$config = new Zend_Config_Ini(BASE_PATH . '/var/config.ini');
$db = Zend_Db::factory($config->database);
Zend_Db_Table::setDefaultAdapter($db);
Zend_Db_Table_Abstract::setDefaultMetadataCache($cache);
