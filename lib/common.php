<?php
define('BASE_PATH', dirname(__file__) . '/../');
set_include_path(get_include_path()
    . PATH_SEPARATOR . realpath(BASE_PATH . '/lib/zendframework/library')
    . PATH_SEPARATOR . realpath(BASE_PATH . '/lib')
);
error_reporting(E_ALL);
require_once 'Zend/Loader/Autoloader.php';
require_once 'Et/Et.php';
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
Et_Model::register('Reader_Member', 'Reader_');
class Reader_Member extends Reader_Member_Base{
    function setPassword($value){
        $this->_set('password_digest', md5($value));
    }
}
Et_Model::register('Reader_Feed', 'Reader_');
class Reader_Feed extends Reader_Feed_Base{
}
Et_Model::register('Reader_Category', 'Reader_');
class Reader_Category extends Reader_Category_Base{
}
Et_Model::register('Reader_Subscription', 'Reader_');
class Reader_Subscription extends Reader_Subscription_Base{
    public static function loadOpml($member, $opml_file){
        $opml = Et_OPML::parseFile($opml_file);
        foreach($opml->feeds as $feed)
        {
            $feed->path = explode('||', $feed->path);
            array_shift($feed->path);
            if($feed->path)
            {
                $category = array_shift($feed->path);
                $oCategory = Reader_Category::findOrCreate(array(
                    'member_id'=>$member->id,
                    'name' => $category,
                ));
            }
            $oFeed = Reader_Feed::findOrCreate(array('feed_url'=>$feed->url), array('name'=>$feed->name));
            self::findOrCreate(array(
                'member_id'=>$member->id,
                'feed_id' => $oFeed->id,
                'category_id'=>$oCategory?$oCategory->id:0
            ));
        }
    }
}
Et_Model::register('Reader_Article', 'Reader_');
class Reader_Article extends Reader_Article_Base{
}

Et_Model::register('Reader_Activity', 'Reader_');
class Reader_Activity extends Reader_Activity_Base{
    function getStream(){
        return (object)array('activities'=>array(), 'continuation'=>'');
    }
    function asCategories(){
        $categories = array();
        if($this->state_read){
            $categories[] = 'state/read';
        }
        if($this->state_starred){
            $categories[] = 'state/starred';
        }
        if($this->state_markasread){
            $categories[] = 'state/markasread';
        }
        if($this->state_unread){
            $categories[] = 'state/unread';
        }
        return $categories;
    }
}
