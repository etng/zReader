<?php
define('BASE_PATH', dirname(__file__) . '/../');
set_include_path(get_include_path()
    . PATH_SEPARATOR . realpath(BASE_PATH . '/lib/zendframework/library')
    . PATH_SEPARATOR . realpath(BASE_PATH . '/lib')
);
require_once 'Zend/Loader/Autoloader.php';
$loader = Zend_Loader_Autoloader::getInstance();
$loader->registerNamespace('Et_');
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

$config = new Zend_Config(
    array(
        'database' => array(
            'adapter' => 'Pdo_Mysql',
            'params'  => array(
                'host'     => 'localhost',
                'dbname'   => 'reader',
                'username' => 'username',
                'password' => 'password',
                'charset' => 'UTF8',
            )
        )
    )
);

$db = Zend_Db::factory($config->database);
Zend_Db_Table::setDefaultAdapter($db);
Zend_Db_Table_Abstract::setDefaultMetadataCache($cache);
function gz_get_contents($filename)
{
    ob_start();
    readgzfile($filename);
    return ob_get_clean();
}


function getFeeds()
{
    if(!file_exists($feeds_cache_file = BASE_PATH . '/var/cache/feeds.json'))
    {
        $opmls = array();
        $opml_suffix = '.opml.xml';
        $opml_path = BASE_PATH .'/var/fixture/opml/';
        foreach(glob($opml_path . '*'.$opml_suffix) as $opml_file)
        {
            $name = basename($opml_file,$opml_suffix );
            $opmls[$name] = $opml = Et_OPML::parseFile($opml_file);
        }
        $feeds = array();
        foreach($opmls as $opml)
        {
            foreach($opml->feeds as $feed)
            {
                $feed->path = explode('||', $feed->path);
                array_shift($feed->path);
                if($feed->path)
                {
                    $category = array_shift($feed->path);
                }
                else
                {
                    $category = 'misc';
                }
                unset($feed->path);
                $feed->category = $category;
                $feeds[]=$feed;
            }
        }
        file_put_contents($feeds_cache_file, json_encode($feeds));
    }
    else
    {
        $feeds = json_decode(file_get_contents($feeds_cache_file), true);
    }
    return $feeds;
}
