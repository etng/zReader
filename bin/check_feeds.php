#!/usr/bin/env php
<?php
require dirname(__file__).'/../lib/common.php';
$feed_table = Reader_Feed::table();
$article_table = Reader_Article::table();
$logger->debug('feeds updator started');
$select = $feed_table->select();
$select->where('synced_at<=notified_at OR synced_at<=?', date('Y-m-d H:i:s', strtotime('-3 hours')));
$members = Reader_Member::all();
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
    try
    {
        $reader = Zend_Feed_Reader::import($feed->feed_url);
        $i = 0;
        foreach($reader as $entry)
        {
            Reader_Article::create(array(
                'feed_id'        => $feed->id,
                'title'        => $entry->getTitle(),
                'origin_url'         => $entry->getLink(),
                'published_at'    => date('Y-m-d H:i:s'),
                'content'      => $entry->getContent(),
            ));
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
    $feed->setFromArray(compact('synced_at', 'sync_status', 'sync_message')).save();
    foreach(Reader_Subscription::filter(array('feed_id'=>$feed->id)) as $subscription){
        foreach($members as $member){
            $stat = array(
                'read'=> Reader_Activity::count('read', array('member_id'=>$member->id)),
                'markasread'=> Reader_Activity::count('markasread', array('member_id'=>$member->id)),
                'unread'=> Reader_Activity::count('unread', array('member_id'=>$member->id)),
                'starred'=> Reader_Activity::count('starred', array('member_id'=>$member->id))
            );
            $subscription->setFromArray($stat)->save();
        }
    }
}
$logger->debug('feeds updator finished');
