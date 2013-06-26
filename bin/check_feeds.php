#!/usr/bin/env php
<?php
require dirname(__file__).'/../lib/common.php';
$logger->debug('feeds updater started');
$feed_table = Reader_Feed::table();
$select = $feed_table->select();
//$select->where('synced_at<=notified_at OR synced_at<=?', date('Y-m-d H:i:s', strtotime('-3 hours')));
foreach($feed_table->fetchAll($select) as $feed)
{
    $logger->debug('feed # ' .$feed->id);
    $logger->debug('feed name ' .$feed->name);
    $logger->debug('feed feed url ' .$feed->feed_url);
    $logger->debug('feed site url ' .$feed->site_url);
    try{
        $count = $feed->check();
        $logger->debug('fetched items:' . $count);
    }catch(Exception $e)
    {
        $logger->debug($e->getMessage());
    }
}
$logger->debug('feeds updator finished');
exit(0);