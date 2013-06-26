<?php
Et_Model::register('Reader_Member', 'Reader_');
class Reader_Member extends Reader_Member_Base{
    function setPassword($value){
        $this->_set('password_digest', md5($value));
    }
    public function getSubscriptions(){
        $subscriptions = array();
        foreach(Reader_Subscription::filter(array('member_id'=>$this->id)) as $subscription){
            $categories=array();
            if($subscription->category_id){
                $categories[]='label/'.Reader_Category::find(array('member_id'=>$this->id, 'id'=>$subscription->category_id))->name;
            }
            $feed = Reader_Feed::find($subscription->feed_id);
            $id = 'feed/' . $feed->feed_url;
            $subscriptions[]=array_merge($feed->pluck(array(
                    'id',
                    'feed_url',
                    'name'=>'title'
                )),
                array_map('intval', $subscription->pluck(array(
                    'read',
                    'starred',
                    'markasread',
                    'unread'
                ))), compact('categories', 'id'));
        }
        return $subscriptions;
    }
}