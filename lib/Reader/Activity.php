<?php
Et_Model::register('Reader_Activity', 'Reader_');
class Reader_Activity extends Reader_Activity_Base{
    public static function markStreamAsRead($member_id, $stream, $timestamp){
        $filters=array();
        $filters['member_id']=$member_id;
        $filters['state_markasread']=0;
        $filters['updated_at<?']=date('Y-m-d H:i:s', $timestamp);
        list($stream_type, $stream_id)= explode('/', $stream, 2);
        if($stream_type=='stream')
        {
            list($stream_type, $stream_id)= explode('/', urldecode($stream_id), 2);
        }
        $subscriptions = array();
        if($stream_type=='feed'){
            $oFeed = Reader_Feed::find(array('feed_url'=>$stream_id));
            $filters['feed_id']=$oFeed->id;
            self::iterateInStep('markAsRead', $filters, false);//state_markasread will change in the markAsRead method, so we do not move on
            Reader_Subscription::iterateInStep('recount', array(
                'feed_id'=>$oFeed->id,
                'member_id'=>$member_id,
            ));
        }
        else if($stream_type=='state'){
            if($stream_id == 'reading-list'){
                self::iterateInStep('markAsRead', $filters, false);
                Reader_Subscription::iterateInStep('recount', array(
                    'member_id'=>$member_id,
                ));
            }
        }
        else if($stream_type=='label'){
            $category_id = 0;
            if(!empty($stream_id)){
                $oCategory = Reader_Category::find(array('name'=>$stream_id));
                if($oCategory){
                    $category_id = $oCategory->id;
                }
            }
            $filters['feed_id IN (?)'] = Reader_Subscription::table()->getAdapter()->fetchCol('select feed_id from subscription where category_id='.$category_id);
            self::iterateInStep('markAsRead', $filters, false);
            Reader_Subscription::iterateInStep('recount', array(
                'member_id'=>$member_id,
                'category_id'=>$category_id,
            ));
        }
        else{
            var_dump($stream_type, $stream_id);die();
        }
        return true;
    }
    function markAsRead()
    {
        $this->refresh();
        $this->setFromArray(array(
            'state_markasread'=>1,
            'state_unread'=>0,
            'state_read'=>0,
        ))->save();
    }
    function getStream($member_id, $stream, $filter, $timestamp, $continuation, $limit){
        $select = self::table()->select();
        $select->where('member_id=?', $member_id);
        if($stream){
            list($stream_type, $stream_id)= explode('/', $stream, 2);
            if($stream_type=='feed'){
                $oFeed = Reader_Feed::find(array('feed_url'=>$stream_id));
                if($oFeed){
                    $select->where('feed_id=?', $oFeed->id);
                }
                else{
                    var_dump($stream_type, $stream_id);
                    die('feed not found');
                }
            }
            elseif($stream_type=='label')
            {
                $category_id = 0;
                if(!empty($stream_id)){
                    $oCategory = Reader_Category::find(array('name'=>$stream_id));
                    if($oCategory){
                        $category_id = $oCategory->id;
                    }
                }
                $db = self::table()->getAdapter();
                $feed_ids = $db->fetchCol('select feed_id from subscription where category_id='.$category_id);
                $select->where('feed_id IN (?)', $feed_ids);
            }
        }
        if($filter){
            list($filter_type, $filter_id)= explode('/', $filter, 2);
            if($filter_type=='state')
            {
                $select->where('state_'.$filter_id.'=?', 1);
            }
            else
            {
                var_dump('wrong filter', $filter_type, $filter_id);
            }
        }
        else{
            //            $select->where('state_unread=?', 1);
        }
        $select->where('updated_at<?', date('Y-m-d H:i:s', $timestamp/1000));
        if($continuation){
            $select->where('id<?', $continuation);
        }
        $select->order('updated_at DESC');
        $select->limit($limit+1);
        $debug = $select->assemble();
        $activities = self::table()->fetchAll($select);
        $last_activity = null;
        if(count($activities)>$limit){
            $last_activity = $activities[$limit];
            unset($activities[$limit]);
        }
        return (object)array('activities'=>$activities, 'continuation'=>$last_activity?$last_activity->id:'', 'debug'=>$debug);
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
