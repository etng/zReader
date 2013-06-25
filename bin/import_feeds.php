#!/usr/bin/env php
<?php
require dirname(__file__).'/../lib/common.php';
$article_table = new Zend_Db_Table('article');
$feed_table = new Zend_Db_Table('feed');
$logger->debug('feed importor started');
$feed_table = new Zend_Db_Table('feed');
$feed_defaults = array(
    'created_at' => date('Y-m-d H:i:s'),
);
foreach(getFeeds() as $feed_data)
{
    $logger->debug('checking feed with url: '. $feed_data['feed_url']);
    $select = $feed_table->select()->where('feed_url=?', $feed_data['feed_url']);
    if(!($feed = $feed_table->fetchRow($select)))
    {
    $logger->debug('not exists, create one');
        unset($feed_data['category']);
        $feed_table->insert(array_merge($feed_defaults, $feed_data));
    }
    $feed = $feed_table->fetchRow($select);
    $logger->debug('feed id is #' . $feed->id);
}
$logger->debug('feed importor finished');
