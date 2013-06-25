#!/usr/bin/env php
<?php
require dirname(__file__).'/../lib/common.php';
$article_table = new Zend_Db_Table('article');
$feed_table = new Zend_Db_Table('feed');
$logger->debug('feeds updator started');
$select = $feed_table->select();
$select->where('synced_at<=notified_at OR synced_at<=?', date('Y-m-d H:i:s', strtotime('-3 hours')));
foreach($feed_table->fetchAll($select) as $feed)
{
    $logger->debug('feed # ' .$feed->id);
    $logger->debug('feed name ' .$feed->name);
    $logger->debug('feed feed url ' .$feed->feed_url);
    $logger->debug('feed site url ' .$feed->site_url);
    if(!$feed->feed_url)
    {
        $logger->debug('feed url empty, can not update');
        continue;
    }
    $synced_at = date('Y-m-d H:i:s');
    $sync_status = true;
    $sync_message = 'ok';
    $feed_id = $feed->id;
    $article_defaults = compact('feed_id', 'updated_at');
    try
    {
        $reader = Zend_Feed_Reader::import($feed->feed_url);
        $i = 0;
        foreach($reader as $entry)
        {
            $article_data= array(
                'title'        => $entry->getTitle(),
                'origin_url'         => $entry->getLink(),
                'published_at'    => date('Y-m-d H:i:s'),
                'content'      => $entry->getContent(),
            );
            $article_table->insert(array_merge($article_defaults, $article_data));
            $i++;
        }
        $sync_message = 'ok, ' . $i . ' items updated';
        $logger->debug('done, '. $i . ' articles inserted');
    }
    catch(Exception $e)
    {
        $sync_status = false;
        $sync_message = $e->getMessage();
        $logger->debug('error: '. $e->getMessage());
    }
    $feed_table->update(compact( 'synced_at', 'sync_status', 'sync_message'), $feed_table->getAdapter()->quoteInto('id=?', $feed->id));
}
$logger->debug('feeds updator finished');
