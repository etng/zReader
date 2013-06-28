#!/usr/bin/env php
<?php
require dirname(__file__).'/../lib/common.php';
$logger->debug('subscription updater started');
$table = Reader_Subscription::table();
$select = $table->select();
$select->where('inited_at=?', '0000-00-00 00:00:00');
while(true)
{
    $logger->debug('get up an work');
    foreach($table->fetchAll($select) as $subscription)
    {
        try{
            $count = $subscription->initActivities();
            $logger->debug("inited subscription {$subscription->id}_{$subscription->member_id}_{$subscription->feed_id}: {$count} articles assigned'");
        }
        catch(Exception $e)
        {
            $logger->debug($e->getMessage());
        }
    }
    $logger->debug('get a rest');
    sleep(30);
}
$logger->debug('subscription updater finished');
exit(0);

