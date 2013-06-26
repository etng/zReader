#!/usr/bin/env php
<?php
require dirname(__file__).'/../lib/common.php';
$logger->debug('feed importor started');
$member = Reader_Member::findOrCreate(array('email'=>'etng2004@gmail.com'), array('password'=>'password'));
$member_id = $member->id;
$logger->debug('member: '. $member->email);

$response = json_decode(gz_get_contents(BASE_PATH . '/var/data/from_gr/subscriptions.json.gz'), true);
foreach($response['subscriptions'] as $subscription){
    $feed_url = substr($subscription['id'], strlen('feed/'));
    $feed_name = $subscription['title'];
    $feed = Reader_Feed::findOrCreate(compact('feed_url'), array('name'=>$feed_name));
    $feed_id = $feed->id;
    $logger->debug('loading ' . $feed->name . '   ' . $feed->id);
    $category_ids = array();
    foreach($subscription['categories'] as $category){
        $name = $category['label'];
        $o_category= Reader_Category::findOrCreate(compact('member_id', 'name'));
        $category_ids []=$o_category->id;
    }
    if(!$category_ids)
    {
        $category_ids[]=0;
    }
    $category_id = current($category_ids);
    $oSubscription = Reader_Subscription::findOrCreate(compact('member_id', 'feed_id'), compact('category_id'));
    $feed_archive_files = glob(BASE_PATH.'/var/data/from_gr/feed/'.urlencode($subscription['id']).'/*.xml.gz');
    $logger->debug(count($feed_archive_files) . " file(s) to import");
    foreach($feed_archive_files as $article_file)
    {
        $xml = gz_get_contents($article_file);
        $logger->debug('loading article collection ' . basename($article_file));
        try{
            $feed->check($xml);
        }
        catch(Exception $e){
            $logger->debug($e->getMessage());
        }
    }
}
$logger->debug('feed importor finished');
exit(0);